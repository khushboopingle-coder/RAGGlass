import os
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

_chroma_client = None

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _chroma_client

def get_project_collection(project_id: int):
    client = get_chroma_client()
    collection_name = f"project_{project_id}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

def add_chunks_to_vector_store(
    project_id: int,
    document_id: int,
    document_filename: str,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]]
) -> List[str]:
    """
    Store chunks and embeddings in ChromaDB with metadata. Returns generated vector IDs.
    """
    collection = get_project_collection(project_id)
    
    ids = []
    documents = []
    metadatas = []
    
    for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        vector_id = f"doc_{document_id}_chunk_{chunk['chunk_index']}"
        ids.append(vector_id)
        documents.append(chunk["content"])
        metadatas.append({
            "document_id": document_id,
            "project_id": project_id,
            "filename": document_filename,
            "chunk_index": chunk["chunk_index"],
            "char_count": chunk["char_count"]
        })
        
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )
    return ids

def query_vector_store(
    project_id: int,
    query_embedding: List[float],
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Perform vector similarity search on ChromaDB for a given project collection.
    Returns list of dicts with content, chunk_index, document_filename, distance, similarity.
    """
    collection = get_project_collection(project_id)
    
    count = collection.count()
    if count == 0:
        return []
        
    actual_top_k = min(top_k, count)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=actual_top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    retrieved = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        dists = results["distances"][0]
        ids = results["ids"][0]
        
        for doc, meta, dist, vid in zip(docs, metas, dists, ids):
            # For cosine space in ChromaDB, distance is in [0, 2].
            # Convert cosine distance to similarity score in percentage / [0, 1] range:
            # Cosine Distance = 1 - Cosine Similarity
            # So Similarity = 1 - Distance (clipped to [0, 1])
            similarity = max(0.0, min(1.0, 1.0 - float(dist)))
            
            retrieved.append({
                "vector_id": vid,
                "content": doc,
                "chunk_index": meta.get("chunk_index", 0),
                "document_filename": meta.get("filename", "Document"),
                "distance": round(float(dist), 4),
                "similarity": round(float(similarity), 4)
            })
            
    return retrieved

def delete_project_vector_store(project_id: int):
    client = get_chroma_client()
    collection_name = f"project_{project_id}"
    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass

def delete_document_vectors(project_id: int, document_id: int):
    collection = get_project_collection(project_id)
    try:
        collection.delete(where={"document_id": document_id})
    except Exception:
        pass
