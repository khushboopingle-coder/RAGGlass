from typing import Dict, Any, List
from .embeddings import generate_single_embedding
from .vector_store import query_vector_store
from .llm import get_llm_response

def execute_rag_pipeline(project_id: int, question: str, top_k: int = 3) -> Dict[str, Any]:
    """
    Executes the query retrieval & LLM answer generation pipeline.
    """
    if not question.strip():
        return {
            "question": question,
            "retrieved_chunks": [],
            "ai_answer": "Please provide a non-empty question to query your document.",
            "ollama_connected": False,
            "grounded": True,
            "sources": []
        }
        
    # 1. Embed Question
    query_vector = generate_single_embedding(question)
    
    # 2. Query Vector Store (ChromaDB)
    retrieved = query_vector_store(project_id=project_id, query_embedding=query_vector, top_k=top_k)
    
    if not retrieved:
        return {
            "question": question,
            "retrieved_chunks": [],
            "ai_answer": "No relevant information was found in the provided document for this project.",
            "ollama_connected": False,
            "grounded": True,
            "sources": []
        }
        
    # 3. Call Configured LLM Provider (Ollama or Groq)
    llm_res = get_llm_response(question=question, context_chunks=retrieved)
    
    return {
        "question": question,
        "retrieved_chunks": retrieved,
        "ai_answer": llm_res["ai_answer"],
        "ollama_connected": llm_res.get("ollama_connected", False),
        "grounded": llm_res.get("grounded", True),
        "sources": retrieved
    }

