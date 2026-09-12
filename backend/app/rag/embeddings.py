import os
import logging
import httpx
from typing import List, Dict, Any, Union
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

logger = logging.getLogger("ragglass.embeddings")

MODEL_NAME = "all-MiniLM-L6-v2"
HF_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

HF_INFERENCE_ENDPOINT = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL_NAME}/pipeline/feature-extraction"

_local_model_instance = None

def get_local_embedding_model():
    """
    Lazily load local SentenceTransformer model.
    Import is deferred so deployments using EMBEDDING_PROVIDER=huggingface do not
    require sentence-transformers or PyTorch to be installed.
    """
    global _local_model_instance
    if _local_model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            logger.error("sentence-transformers package not installed.")
            raise HTTPException(
                status_code=500,
                detail="Local embedding package 'sentence-transformers' is not installed. Install it or set EMBEDDING_PROVIDER=huggingface."
            )
        logger.info(f"[RAGGlass] Loading local SentenceTransformer model: {MODEL_NAME}...")
        _local_model_instance = SentenceTransformer(MODEL_NAME)
        logger.info(f"[RAGGlass] Model {MODEL_NAME} loaded successfully ({EMBEDDING_DIMENSIONS} dimensions).")
    return _local_model_instance

def _mean_pooling(token_embeddings: List[List[float]]) -> List[float]:
    """
    Perform mean pooling over token embeddings if Hugging Face API returns token-level vectors.
    """
    if not token_embeddings:
        return [0.0] * EMBEDDING_DIMENSIONS
    dim = len(token_embeddings[0])
    num_tokens = len(token_embeddings)
    sum_vec = [0.0] * dim
    for token in token_embeddings:
        for i in range(min(dim, len(token))):
            sum_vec[i] += token[i]
    return [val / num_tokens for val in sum_vec]

def _parse_hf_response(data: Any, expected_count: int) -> List[List[float]]:
    """
    Parse Hugging Face Inference API feature extraction output into List[List[float]] of shape (expected_count, 384).
    """
    if not isinstance(data, list):
        logger.error("Unexpected output format from Hugging Face Inference API.")
        raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")

    # Case 1: 1D list of floats for a single text input [float, ...]
    if expected_count == 1 and data and isinstance(data[0], (int, float)):
        return [data]

    # Case 2: 2D list of floats [[float, ...], [float, ...]] -> shape (expected_count, 384)
    if data and isinstance(data[0], list) and data[0] and isinstance(data[0][0], (int, float)):
        if len(data) == expected_count:
            return data
        elif expected_count == 1:
            return [_mean_pooling(data)]

    # Case 3: 3D list of floats [[[float, ...], ...], ...] -> shape (expected_count, tokens, 384)
    if data and isinstance(data[0], list) and data[0] and isinstance(data[0][0], list):
        results = []
        for sentence_tokens in data:
            if isinstance(sentence_tokens, list) and sentence_tokens and isinstance(sentence_tokens[0], list):
                results.append(_mean_pooling(sentence_tokens))
            elif isinstance(sentence_tokens, list) and isinstance(sentence_tokens[0], (int, float)):
                results.append(sentence_tokens)
        return results

    logger.error("Unable to parse Hugging Face embedding output structure.")
    raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")

def _generate_huggingface_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings by querying the free Hugging Face Inference API.
    """
    hf_key = os.getenv("HF_API_KEY", "").strip()
    if not hf_key or hf_key == "paste_your_hf_token_here":
        logger.warning("Hugging Face provider selected, but HF_API_KEY is not configured or uses default placeholder.")
        raise HTTPException(
            status_code=503,
            detail="Embedding service temporarily unavailable. Please configure a valid HF_API_KEY."
        )

    headers = {
        "Authorization": f"Bearer {hf_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "inputs": texts,
        "options": {
            "wait_for_model": True
        }
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(HF_INFERENCE_ENDPOINT, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return _parse_hf_response(data, expected_count=len(texts))

            # Internal logging without leaking key or raw body
            logger.error("Hugging Face API call returned HTTP status code %s", resp.status_code)
            raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Hugging Face API connection error.")
        raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate 384-dimensional dense embeddings for a list of text strings.
    Dispatches between local sentence-transformers and Hugging Face Inference API based on EMBEDDING_PROVIDER.
    """
    if not texts:
        return []

    provider = os.getenv("EMBEDDING_PROVIDER", "local").strip().lower()

    if provider == "huggingface":
        return _generate_huggingface_embeddings(texts)
    else:
        model = get_local_embedding_model()
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return embeddings.tolist()

def generate_single_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for a single query text string.
    """
    results = generate_embeddings([text])
    if results and len(results) > 0:
        return results[0]
    return [0.0] * EMBEDDING_DIMENSIONS
