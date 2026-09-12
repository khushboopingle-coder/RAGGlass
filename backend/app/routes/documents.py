import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project, Document, Chunk
from ..schemas import DocumentOut, ProcessTextRequest, EmbedDocumentRequest

# Server-side security validation constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".json"}
MAX_PASTED_TEXT_LENGTH = 500000  # 500k characters max

def validate_uploaded_file(file: UploadFile, file_bytes: bytes):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the 10MB limit."
        )

def validate_pasted_text(text: str):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Pasted text cannot be empty.")
    if len(text) > MAX_PASTED_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Pasted text exceeds maximum limit of {MAX_PASTED_TEXT_LENGTH} characters."
        )


def _chunk_only_document(
    db: Session,
    project_id: int,
    filename: str,
    raw_text: str,
    source_type: str,
    chunk_size: int,
    chunk_overlap: int
) -> DocumentOut:
    raw_chunks = split_text_into_chunks(raw_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    if not raw_chunks:
        raise HTTPException(status_code=400, detail="No chunks created from the document text.")

    # Invalidate old documents and vector store on re-chunking
    db.query(Document).filter(Document.project_id == project_id).delete()
    db.commit()
    delete_project_vector_store(project_id)

    doc_record = Document(
        project_id=project_id,
        filename=filename,
        source_type=source_type,
        char_count=len(raw_text),
        chunk_count=len(raw_chunks),
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_model=MODEL_NAME,
        vector_status="pending"
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    db_chunks = []
    for chunk_info in raw_chunks:
        v_id = f"doc_{doc_record.id}_chunk_{chunk_info['chunk_index']}"
        chk = Chunk(
            document_id=doc_record.id,
            project_id=project_id,
            chunk_index=chunk_info["chunk_index"],
            content=chunk_info["content"],
            char_count=chunk_info["char_count"],
            vector_id=v_id
        )
        db.add(chk)
        db_chunks.append(chk)
    db.commit()

    formatted_chunks = [
        {
            "id": chk.id,
            "chunk_index": chk.chunk_index,
            "content": chk.content,
            "char_count": chk.char_count,
            "vector_id": chk.vector_id,
            "is_embedded": False,
            "embedding": None
        }
        for chk in db_chunks
    ]

    return {
        "id": doc_record.id,
        "project_id": doc_record.project_id,
        "filename": doc_record.filename,
        "source_type": doc_record.source_type,
        "char_count": doc_record.char_count,
        "chunk_count": doc_record.chunk_count,
        "chunk_size": doc_record.chunk_size,
        "chunk_overlap": doc_record.chunk_overlap,
        "embedding_model": doc_record.embedding_model,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "vector_status": doc_record.vector_status,
        "created_at": doc_record.created_at,
        "chunks": formatted_chunks
    }
from ..auth import get_current_user
from ..rag.loader import extract_text_from_bytes
from ..rag.chunker import split_text_into_chunks
from ..rag.embeddings import generate_embeddings, EMBEDDING_DIMENSIONS, MODEL_NAME
from ..rag.vector_store import add_chunks_to_vector_store, delete_project_vector_store, delete_document_vectors

router = APIRouter(prefix="/api/projects", tags=["Documents"])

def _process_and_store_document(
    db: Session,
    project_id: int,
    filename: str,
    raw_text: str,
    source_type: str,
    chunk_size: int,
    chunk_overlap: int
) -> DocumentOut:
    # 1. Split text into chunks
    raw_chunks = split_text_into_chunks(raw_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    if not raw_chunks:
        raise HTTPException(status_code=400, detail="No chunks created from the document text.")

    # 2. Save Document record to DB
    doc_record = Document(
        project_id=project_id,
        filename=filename,
        source_type=source_type,
        char_count=len(raw_text),
        chunk_count=len(raw_chunks),
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_model=MODEL_NAME,
        vector_status="completed"
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # 3. Generate embeddings using sentence-transformers (all-MiniLM-L6-v2)
    chunk_texts = [c["content"] for c in raw_chunks]
    embeddings = generate_embeddings(chunk_texts)

    # 4. Store in ChromaDB
    vector_ids = add_chunks_to_vector_store(
        project_id=project_id,
        document_id=doc_record.id,
        document_filename=filename,
        chunks=raw_chunks,
        embeddings=embeddings
    )

    # 5. Save Chunks to SQLite
    db_chunks = []
    for chunk_info, v_id in zip(raw_chunks, vector_ids):
        chk = Chunk(
            document_id=doc_record.id,
            project_id=project_id,
            chunk_index=chunk_info["chunk_index"],
            content=chunk_info["content"],
            char_count=chunk_info["char_count"],
            vector_id=v_id
        )
        db.add(chk)
        db_chunks.append(chk)
    db.commit()

    # Format response
    formatted_chunks = [
        {
            "id": chk.id,
            "chunk_index": chk.chunk_index,
            "content": chk.content,
            "char_count": chk.char_count,
            "vector_id": chk.vector_id,
            "is_embedded": True
        }
        for chk in db_chunks
    ]

    return {
        "id": doc_record.id,
        "project_id": doc_record.project_id,
        "filename": doc_record.filename,
        "source_type": doc_record.source_type,
        "char_count": doc_record.char_count,
        "chunk_count": doc_record.chunk_count,
        "chunk_size": doc_record.chunk_size,
        "chunk_overlap": doc_record.chunk_overlap,
        "embedding_model": doc_record.embedding_model,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "vector_status": doc_record.vector_status,
        "created_at": doc_record.created_at,
        "chunks": formatted_chunks
    }

@router.post("/{project_id}/documents", response_model=DocumentOut)
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    file_bytes = await file.read()
    validate_uploaded_file(file, file_bytes)
    raw_text = extract_text_from_bytes(file_bytes, file.filename)
    
    return _process_and_store_document(
        db=db,
        project_id=project_id,
        filename=file.filename,
        raw_text=raw_text,
        source_type="upload",
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )

@router.post("/{project_id}/process", response_model=DocumentOut)
def process_pasted_text(
    project_id: int,
    request: ProcessTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    validate_pasted_text(request.text)

    return _process_and_store_document(
        db=db,
        project_id=project_id,
        filename=request.filename or "Pasted Document",
        raw_text=request.text.strip(),
        source_type="paste",
        chunk_size=request.chunk_size,
        chunk_overlap=request.chunk_overlap
    )

@router.post("/{project_id}/chunk-upload", response_model=DocumentOut)
async def chunk_upload_document(
    project_id: int,
    file: UploadFile = File(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    file_bytes = await file.read()
    validate_uploaded_file(file, file_bytes)
    raw_text = extract_text_from_bytes(file_bytes, file.filename)
    
    return _chunk_only_document(
        db=db,
        project_id=project_id,
        filename=file.filename,
        raw_text=raw_text,
        source_type="upload",
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )

@router.post("/{project_id}/chunk-text", response_model=DocumentOut)
def chunk_pasted_text(
    project_id: int,
    request: ProcessTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    validate_pasted_text(request.text)

    return _chunk_only_document(
        db=db,
        project_id=project_id,
        filename=request.filename or "Pasted Document",
        raw_text=request.text.strip(),
        source_type="paste",
        chunk_size=request.chunk_size,
        chunk_overlap=request.chunk_overlap
    )

@router.post("/{project_id}/embed", response_model=DocumentOut)
def generate_document_embeddings(
    project_id: int,
    request: EmbedDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    doc = db.query(Document).filter(Document.id == request.document_id, Document.project_id == project_id).first()
    if not doc or not doc.chunks:
        raise HTTPException(status_code=400, detail="No document chunks found to embed.")

    raw_chunks = [{"chunk_index": chk.chunk_index, "content": chk.content, "char_count": chk.char_count} for chk in doc.chunks]
    chunk_texts = [c["content"] for c in raw_chunks]
    embeddings = generate_embeddings(chunk_texts)

    add_chunks_to_vector_store(
        project_id=project_id,
        document_id=doc.id,
        document_filename=doc.filename,
        chunks=raw_chunks,
        embeddings=embeddings
    )

    doc.vector_status = "completed"
    db.commit()

    formatted_chunks = [
        {
            "id": chk.id,
            "chunk_index": chk.chunk_index,
            "content": chk.content,
            "char_count": chk.char_count,
            "vector_id": chk.vector_id,
            "is_embedded": True,
            "embedding": emb
        }
        for chk, emb in zip(doc.chunks, embeddings)
    ]

    return {
        "id": doc.id,
        "project_id": doc.project_id,
        "filename": doc.filename,
        "source_type": doc.source_type,
        "char_count": doc.char_count,
        "chunk_count": doc.chunk_count,
        "chunk_size": doc.chunk_size,
        "chunk_overlap": doc.chunk_overlap,
        "embedding_model": doc.embedding_model,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "vector_status": doc.vector_status,
        "created_at": doc.created_at,
        "chunks": formatted_chunks
    }

@router.get("/{project_id}/documents", response_model=List[DocumentOut])
def get_project_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    documents = db.query(Document).filter(Document.project_id == project_id).order_by(Document.created_at.desc()).all()
    results = []
    for doc in documents:
        formatted_chunks = [
            {
                "id": chk.id,
                "chunk_index": chk.chunk_index,
                "content": chk.content,
                "char_count": chk.char_count,
                "vector_id": chk.vector_id,
                "is_embedded": True
            }
            for chk in doc.chunks
        ]
        results.append({
            "id": doc.id,
            "project_id": doc.project_id,
            "filename": doc.filename,
            "source_type": doc.source_type,
            "char_count": doc.char_count,
            "chunk_count": doc.chunk_count,
            "chunk_size": doc.chunk_size,
            "chunk_overlap": doc.chunk_overlap,
            "embedding_model": doc.embedding_model,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
            "vector_status": doc.vector_status,
            "created_at": doc.created_at,
            "chunks": formatted_chunks
        })
    return results

@router.delete("/{project_id}/documents")
def delete_all_project_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    delete_project_vector_store(project_id)
    db.query(Document).filter(Document.project_id == project_id).delete()
    db.commit()
    return {"message": "All documents and vector embeddings cleared for project."}

@router.delete("/{project_id}/documents/{document_id}")
def delete_single_document(
    project_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    doc = db.query(Document).filter(Document.id == document_id, Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    delete_document_vectors(project_id, document_id)
    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.filename}' and its vectors deleted successfully."}
