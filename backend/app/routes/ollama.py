from fastapi import APIRouter
from ..schemas import OllamaStatusResponse
from ..rag.ollama import check_ollama_status

router = APIRouter(prefix="/api/ollama", tags=["Ollama Status"])

@router.get("/status", response_model=OllamaStatusResponse)
def get_ollama_status():
    status_info = check_ollama_status()
    return status_info
