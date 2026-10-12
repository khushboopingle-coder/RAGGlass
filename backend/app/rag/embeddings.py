import os
import logging
import httpx
from typing import List, Any
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

logger = logging.getLogger("ragglass.embeddings")

MODEL_NAME = "all-MiniLM-L6-v2"
HF_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

HF_INFERENCE_ENDPOINT = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL_NAME}/pipeline/feature-extraction"

_local_model_instance = None
_fastembed_instance = None


def get_local_embedding_model():
    """
    Lazily load local SentenceTransformer model (needs sentence-transformers installed).
    """
    global _local_model_instance
    if _local_model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            logger.error("sentence-transformers package not installed.")
            raise HTTPException(
                status_code=500,
                detail="Local embedding package 'sentence-transformers' is not installed. Set EMBEDDING_PROVIDER=huggingface or fastembed."
            )
        logger.info(f"[RAGGlass] Loading local SentenceTransformer model: {MODEL_NAME}...")
        _local_model_instance = SentenceTransformer(MODEL_NAME)
        logger.info(f"[RAGGlass] Model {MODEL_NAME} loaded successfully ({EMBEDDING_DIMENSIONS} dimensions).")
    return _local_model_instance


def _generate_fastembed_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Free, lightweight embeddings using ONNX (no API key, no credits, no PyTorch).
    Same model as before: all-MiniLM-L6-v2, 384 dimensions.
    """
    global _fastembed_instance
    try:
        if _fastembed_instance is None:
            from fastembed import TextEmbedding
            logger.info("[RAGGlass] Loading fastembed model %s...", HF_MODEL_NAME)
            _fastembed_instance = TextEmbedding(model_name=HF_MODEL_NAME)
            logger.info("[RAGGlass] fastembed model loaded.")
        return [vec.tolist() for vec in _fastembed_instance.embed(texts)]
    except Exception as e:
        logger.error("FASTEMBED FAILED: %s", repr(e))
        raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")


def _mean_pooling(token_embeddings: List[List[float]]) -> List[float]:
    """
    Mean pooling over token embeddings if the API returns token-level vectors.
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
    Parse Hugging Face feature extraction output into shape (expected_count, 384).
    """
    if not isinstance(data, list):
        logger.error("Unexpected output format from Hugging Face Inference API.")
        raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")

    # 1D list of floats for a single text
    if expected_count == 1 and data and isinstance(data[0], (int, float)):
        return [data]

    # 2D list [[float, ...], ...]
    if data and isinstance(data[0], list) and data[0] and isinstance(data[0][0], (int, float)):
        if len(data) == expected_count:
            return data
        elif expected_count == 1:
            return [_mean_pooling(data)]

    # 3D list [[[float, ...], ...], ...]
    if data and isinstance(data[0], list) and data[0] and isinstance(data[0][0], list):
        results = []
        for sentence_tokens in data:
            if isinstance(sentence_tokens, list) and sentence_tokens and isinstance(sentence_tokens[0], list):
                results.append(_mean_pooling(sentence_tokens))
            elif isinstance(sentence_tokens, list) and sentence_tokens and isinstance(sentence_tokens[0], (int, float)):
                results.append(sentence_tokens)
        return results

    logger.error("Unable to parse Hugging Face embedding output structure.")
    raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")


def _generate_huggingface_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings through the Hugging Face Inference API.
    """
    import time

    hf_key = os.getenv("HF_API_KEY", "").strip().strip('"').strip("'")
    if not hf_key or hf_key == "paste_your_hf_token_here":
        logger.error("HF_API_KEY is missing or still the placeholder.")
        raise HTTPException(
            status_code=503,
            detail="Embedding service temporarily unavailable. Please configure a valid HF_API_KEY."
        )

    headers = {
        "Authorization": f"Bearer {hf_key}",
        "Content-Type": "application/json"
    }
    payload = {"inputs": texts}

    for attempt in range(3):
        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(HF_INFERENCE_ENDPOINT, headers=headers, json=payload)
        except Exception as e:
            logger.error("HF EMBEDDING CONNECTION ERROR: %s", repr(e))
            raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")

        if resp.status_code == 200:
            return _parse_hf_response(resp.json(), expected_count=len(texts))

        logger.error("HF EMBEDDING FAILED attempt %s: status=%s body=%s", attempt + 1, resp.status_code, resp.text[:300])

        # Model still loading or rate limited: wait and retry
        if resp.status_code in (429, 503):
            time.sleep(5)
            continue
        break

    raise HTTPException(status_code=503, detail="Embedding service temporarily unavailable.")


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate 384-dimensional embeddings for a list of texts.

    EMBEDDING_PROVIDER:
      - "huggingface": try the Hugging Face API first; if it fails
                       (no credits, rate limit, outage), fall back to fastembed.
      - "fastembed":   use fastembed directly (free, no API key).
      - anything else: use local sentence-transformers.
    """
    if not texts:
        return []

    provider = os.getenv("EMBEDDING_PROVIDER", "local").strip().lower()

    if provider == "huggingface":
        try:
            return _generate_huggingface_embeddings(texts)
        except HTTPException:
            logger.warning("Hugging Face embeddings failed, falling back to fastembed.")
            return _generate_fastembed_embeddings(texts)
    elif provider == "fastembed":
        return _generate_fastembed_embeddings(texts)
    else:
        model = get_local_embedding_model()
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return embeddings.tolist()


def generate_single_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for a single query text.
    """
    results = generate_embeddings([text])
    if results and len(results) > 0:
        return results[0]
    return [0.0] * EMBEDDING_DIMENSIONS
