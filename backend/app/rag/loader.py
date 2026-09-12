import io
import re
import zlib
import logging
from pypdf import PdfReader
from pypdf.errors import PdfReadError, PdfStreamError
from fastapi import HTTPException

logger = logging.getLogger("ragglass.loader")

def _extract_raw_pdf_stream_text(file_bytes: bytes) -> str:
    """
    Fallback raw text extractor: scans PDF byte streams for uncompressed/compressed text blocks
    when pypdf encounters EOF marker corruption or truncated stream errors.
    """
    extracted_tokens = []

    # 1. Extract text from uncompressed (BT ... ET) blocks
    uncompressed_blocks = re.findall(rb'BT[\s\S]*?ET', file_bytes)
    for block in uncompressed_blocks:
        strings = re.findall(rb'\((.*?)\)\s*Tj', block) + re.findall(rb'\[(.*?)\]\s*TJ', block)
        for s in strings:
            clean_str = re.sub(rb'\\[0-9]{3}', b'', s)
            clean_str = clean_str.replace(b'\\(', b'(').replace(b'\\)', b')')
            try:
                decoded = clean_str.decode('utf-8', errors='ignore').strip()
                if decoded and len(decoded) > 1:
                    extracted_tokens.append(decoded)
            except Exception:
                continue

    # 2. Extract text from compressed streams (zlib / FlateDecode)
    stream_blocks = re.findall(rb'stream\r?\n([\s\S]*?)\r?\nendstream', file_bytes)
    for stream_data in stream_blocks:
        try:
            decompressed = zlib.decompress(stream_data)
            strings = re.findall(rb'\((.*?)\)\s*Tj', decompressed) + re.findall(rb'\[(.*?)\]\s*TJ', decompressed)
            for s in strings:
                clean_str = re.sub(rb'\\[0-9]{3}', b'', s)
                clean_str = clean_str.replace(b'\\(', b'(').replace(b'\\)', b')')
                try:
                    decoded = clean_str.decode('utf-8', errors='ignore').strip()
                    if decoded and len(decoded) > 1:
                        extracted_tokens.append(decoded)
                except Exception:
                    continue
        except Exception:
            continue

    return " ".join(extracted_tokens)

def _extract_pdf_pages(pdf_file: io.BytesIO, strict: bool = False) -> list:
    pdf_file.seek(0)
    try:
        reader = PdfReader(pdf_file, strict=strict)
    except (PdfReadError, PdfStreamError, Exception) as init_err:
        logger.warning(f"[RAGGlass] PdfReader init failed (strict={strict}): {init_err}")
        return []

    if getattr(reader, "is_encrypted", False):
        try:
            reader.decrypt("")
        except Exception as decrypt_err:
            logger.warning(f"[RAGGlass] PDF decryption with empty password failed: {decrypt_err}")

    extracted_pages = []

    try:
        pages_list = list(reader.pages)
    except (PdfReadError, PdfStreamError, Exception) as catalog_err:
        logger.warning(f"[RAGGlass] Failed to load page catalog from PdfReader (strict={strict}): {catalog_err}")
        return []

    for idx, page in enumerate(pages_list):
        try:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                extracted_pages.append(page_text.strip())
        except (PdfReadError, PdfStreamError, Exception) as page_err:
            logger.warning(f"[RAGGlass] Failed to extract text from page {idx + 1} (strict={strict}): {page_err}")
            continue

    return extracted_pages

def sanitize_unicode(text: str) -> str:
    """
    Strips invalid/unpaired Unicode surrogate code points (U+D800 to U+DFFF)
    to ensure UTF-8 encoding safety for SQLite database storage and JSON serialization.
    """
    if not text:
        return ""
    cleaned = re.sub(r'[\uD800-\uDFFF]', '', text)
    return cleaned.encode('utf-8', 'surrogatepass').decode('utf-8', 'ignore')

def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extract text content from uploaded file bytes (PDF or TXT).
    Resilient against stream truncation, EOF corruption, encrypted streams, and malformed xref tables.
    """
    filename_lower = filename.lower()
    text = ""

    if filename_lower.endswith(".pdf"):
        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded PDF file is empty (0 bytes)."
            )

        pdf_file = io.BytesIO(file_bytes)
        extracted_pages = []

        # Pass 1: Non-strict pypdf extraction
        try:
            extracted_pages = _extract_pdf_pages(pdf_file, strict=False)
        except Exception as primary_err:
            logger.warning(f"[RAGGlass] Primary pypdf extraction (strict=False) failed: {primary_err}")

        # Pass 2: Strict pypdf extraction fallback
        if not extracted_pages:
            try:
                pdf_file.seek(0)
                extracted_pages = _extract_pdf_pages(pdf_file, strict=True)
            except Exception as secondary_err:
                logger.warning(f"[RAGGlass] Secondary pypdf extraction (strict=True) failed: {secondary_err}")

        text = "\n\n".join(extracted_pages).strip()

        # Pass 3: Raw PDF stream fallback scanner if pypdf failed or produced empty text
        if not text:
            logger.info(f"[RAGGlass] Attempting raw PDF stream fallback extraction for '{filename}'...")
            raw_extracted_text = _extract_raw_pdf_stream_text(file_bytes)
            if raw_extracted_text and raw_extracted_text.strip():
                logger.info(f"[RAGGlass] Raw stream fallback recovered {len(raw_extracted_text)} characters for '{filename}'.")
                text = raw_extracted_text.strip()
    else:
        # TXT or generic text format
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to decode text file: " + str(e)
                )

    clean_text = sanitize_unicode(text).strip()
    if not clean_text:
        raise HTTPException(
            status_code=400,
            detail="Extracted text is empty. Please provide a document containing readable text."
        )
    return clean_text
