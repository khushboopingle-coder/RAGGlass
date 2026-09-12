/**
 * Vector Math Utilities for RAGGlass
 */

/**
 * Calculates Cosine Similarity between two numeric vectors.
 * Returns a float between -1.0 and 1.0.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const valA = vecA[i];
    const valB = vecB[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Downsamples a high-dimensional vector (e.g. 384d) into numBins averaged points (e.g. 24).
 * Returns an array of numBins float values.
 */
export function downsampleVector(vec, numBins = 24) {
  if (!vec || !Array.isArray(vec) || vec.length === 0) {
    return [];
  }

  const binSize = vec.length / numBins;
  const result = [];

  for (let b = 0; b < numBins; b++) {
    const start = Math.floor(b * binSize);
    const end = Math.floor((b + 1) * binSize);
    let sum = 0;
    let count = 0;
    for (let i = start; i < end && i < vec.length; i++) {
      sum += vec[i];
      count++;
    }
    result.push(count > 0 ? sum / count : 0);
  }

  return result;
}

/**
 * Finds the global minimum and maximum float values across all chunk embeddings in a document.
 */
export function findGlobalBounds(chunks, numBins = 24) {
  let min = Infinity;
  let max = -Infinity;

  if (!chunks || !Array.isArray(chunks)) {
    return { min: -0.2, max: 0.2 };
  }

  for (const chunk of chunks) {
    if (chunk.embedding && Array.isArray(chunk.embedding)) {
      const binned = downsampleVector(chunk.embedding, numBins);
      for (const val of binned) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
  }

  if (min === Infinity || max === -Infinity || min === max) {
    return { min: -0.2, max: 0.2 };
  }

  return { min, max };
}
