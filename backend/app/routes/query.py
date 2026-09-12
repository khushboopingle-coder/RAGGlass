from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project
from ..schemas import QueryRequest, QueryResponse
from ..auth import get_current_user
from ..rag.retrieval import execute_rag_pipeline

router = APIRouter(prefix="/api/projects", tags=["RAG Query"])

@router.post("/{project_id}/query", response_model=QueryResponse)
def query_project_rag(
    project_id: int,
    query_in: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if not project.documents:
        raise HTTPException(status_code=400, detail="No documents processed in this project yet. Upload a document or paste text first.")

    res = execute_rag_pipeline(
        project_id=project_id,
        question=query_in.question,
        top_k=query_in.top_k
    )
    
    return res
