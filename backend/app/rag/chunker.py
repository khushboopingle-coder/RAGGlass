import re
from typing import List, Dict

def sanitize_unicode(text: str) -> str:
    """
    Strips invalid/unpaired Unicode surrogate code points (U+D800 to U+DFFF)
    to ensure UTF-8 encoding safety for SQLite database storage and JSON serialization.
    """
    if not text:
        return ""
    cleaned = re.sub(r'[\uD800-\uDFFF]', '', text)
    return cleaned.encode('utf-8', 'surrogatepass').decode('utf-8', 'ignore')

def split_text_into_chunks(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[Dict]:
    """
    Splits text into overlapping chunks using character length with boundary awareness.
    Returns a list of dicts with chunk_index, content, char_count.
    """
    if not text or not text.strip():
        return []
        
    text = sanitize_unicode(text).strip()
    chunk_size = max(50, chunk_size)
    chunk_overlap = min(max(0, chunk_overlap), chunk_size - 10)
    step_stride = max(1, chunk_size - chunk_overlap)
    
    chunks = []
    start = 0
    text_length = len(text)
    chunk_idx = 1
    
    while start < text_length:
        remaining_len = text_length - start
        if remaining_len <= chunk_overlap and chunks:
            break

        end = min(start + chunk_size, text_length)
        
        # If not at the end of the text, try to find a natural breakpoint
        if end < text_length:
            search_window_start = max(start + int(chunk_size * 0.4), end - int(chunk_size * 0.2))
            
            paragraph_break = text.rfind("\n\n", search_window_start, end)
            if paragraph_break != -1:
                end = paragraph_break + 2
            else:
                sentence_break = text.rfind(". ", search_window_start, end)
                if sentence_break != -1:
                    end = sentence_break + 2
                else:
                    space_break = text.rfind(" ", search_window_start, end)
                    if space_break != -1:
                        end = space_break + 1

        chunk_content = sanitize_unicode(text[start:end]).strip()
        if chunk_content:
            chunks.append({
                "chunk_index": chunk_idx,
                "content": chunk_content,
                "char_count": len(chunk_content)
            })
            chunk_idx += 1

        if end >= text_length:
            break
            
        start = start + step_stride
        
    return chunks
