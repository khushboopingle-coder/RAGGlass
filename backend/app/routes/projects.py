from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Project
from ..schemas import ProjectCreate, ProjectOut
from ..auth import get_current_user
from ..rag.vector_store import delete_project_vector_store

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def get_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()
    results = []
    for proj in projects:
        doc_count = len(proj.documents)
        p_dict = {
            "id": proj.id,
            "user_id": proj.user_id,
            "name": proj.name,
            "description": proj.description,
            "created_at": proj.created_at,
            "document_count": doc_count
        }
        results.append(p_dict)
    return results

@router.post("", response_model=ProjectOut)
def create_project(project_in: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(
        user_id=current_user.id,
        name=project_in.name,
        description=project_in.description
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at,
        "document_count": 0
    }

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at,
        "document_count": len(project.documents)
    }

@router.delete("/{project_id}")
def delete_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    # Delete vector store
    delete_project_vector_store(project_id)
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully."}
