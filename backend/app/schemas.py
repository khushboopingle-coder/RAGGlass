from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

# --- Auth Schemas ---
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    created_at: datetime
    document_count: int = 0

    class Config:
        from_attributes = True

# --- Chunk & Document Schemas ---
class ChunkOut(BaseModel):
    id: int
    chunk_index: int
    content: str
    char_count: int
    vector_id: str
    is_embedded: bool = True
    embedding: Optional[List[float]] = None

class DocumentOut(BaseModel):
    id: int
    project_id: int
    filename: str
    source_type: str
    char_count: int
    chunk_count: int
    chunk_size: int
    chunk_overlap: int
    embedding_model: str
    embedding_dimensions: int = 384
    vector_status: str
    created_at: datetime
    chunks: List[ChunkOut] = []

    class Config:
        from_attributes = True

class ProcessTextRequest(BaseModel):
    text: str
    filename: Optional[str] = "Pasted Document"
    chunk_size: int = 500
    chunk_overlap: int = 50

class EmbedDocumentRequest(BaseModel):
    document_id: int

# --- Query Schemas ---
class QueryRequest(BaseModel):
    question: str
    top_k: int = 3

class RetrievedChunk(BaseModel):
    chunk_index: int
    document_filename: str
    content: str
    similarity: float
    distance: float
    vector_id: str

class QueryResponse(BaseModel):
    question: str
    retrieved_chunks: List[RetrievedChunk]
    ai_answer: str
    ollama_connected: bool
    grounded: bool
    sources: List[RetrievedChunk]

# --- Ollama Status ---
class OllamaStatusResponse(BaseModel):
    connected: bool
    url: str
    model: str
    available_models: List[str] = []
    message: str
