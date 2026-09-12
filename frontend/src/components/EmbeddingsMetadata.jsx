import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { extractTopTerms } from '../utils/termExtraction';
import { cosineSimilarity, findGlobalBounds } from '../utils/vectorMath';
import { VectorSparkline } from './VectorSparkline';
import { Cpu, ExternalLink, ChevronDown, ChevronUp, Target, Sparkles, X, RotateCcw } from 'lucide-react';

export const EmbeddingsMetadata = () => {
  const { activeDocument } = useProject();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRefIdx, setSelectedRefIdx] = useState(null);

  const chunks = activeDocument?.chunks || [];
  const hasEmbeddings =
    activeDocument?.vector_status === 'completed' &&
    chunks.some((c) => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0);

  // Compute global min/max bounds for unified y-axis scaling across all sparklines
  const globalBounds = useMemo(() => {
    return hasEmbeddings ? findGlobalBounds(chunks, 24) : { min: -0.2, max: 0.2 };
  }, [chunks, hasEmbeddings]);

  if (!activeDocument || !chunks || chunks.length === 0) {
    return null;
  }

  const handleJump = (chunkIndex) => {
    const el = document.getElementById(`chunk-card-idx-${chunkIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-1');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-1');
      }, 2000);
    }
  };

  // Find user-selected reference chunk for similarity comparison
  const refChunk = selectedRefIdx !== null ? chunks.find((c) => c.chunk_index === selectedRefIdx) : null;
  const refEmbedding = refChunk?.embedding;

  const initialRowsCount = 10;
  const totalChunks = chunks.length;
  const displayedChunks = isExpanded ? chunks : chunks.slice(0, initialRowsCount);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            EMBEDDINGS & METADATA
          </h2>
          <p className="text-xs text-slate-500">
            {hasEmbeddings && selectedRefIdx === null
              ? 'Click any chunk row to set it as a reference for semantic similarity comparison.'
              : hasEmbeddings && selectedRefIdx !== null
              ? `Comparing all chunks semantically against reference Chunk #${selectedRefIdx}.`
              : 'Vector dimension sparklines, top term frequencies, and jump links.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {hasEmbeddings && selectedRefIdx !== null && (
            <button
              onClick={() => setSelectedRefIdx(null)}
              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1 transition-colors"
              title="Reset comparison selection"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Comparing vs #{selectedRefIdx} (Reset)</span>
            </button>
          )}

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              hasEmbeddings
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            Model: {activeDocument.embedding_model || 'all-MiniLM-L6-v2'} ({activeDocument.embedding_dimensions || 384}d)
          </span>
        </div>
      </div>

      {/* Notice Banner when Embeddings are Pending */}
      {!hasEmbeddings && (
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-lg p-3 text-xs text-purple-800 flex items-center space-x-2 mb-4">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span>
            Vector embeddings pending. Click <strong>"2. Generate Embeddings"</strong> above to compute 384-dimensional dense vectors and interactive semantic similarity.
          </span>
        </div>
      )}

      {/* Interactive Helper Banner when Embeddings Exist & No Selection Yet */}
      {hasEmbeddings && selectedRefIdx === null && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px] text-slate-600 flex items-center space-x-2 mb-4">
          <Target className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
          <span>
            <strong>Interactive Compare:</strong> Click <strong>"Compare"</strong> on any row to set that chunk as reference and measure cosine similarity across all document chunks.
          </span>
        </div>
      )}

      {/* Table Area */}
      <div className={`border border-slate-200 rounded-xl overflow-hidden ${isExpanded ? 'max-h-[400px] overflow-y-auto' : ''}`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-4">Chunk #</th>
              <th className="py-2.5 px-4">
                {hasEmbeddings && selectedRefIdx !== null
                  ? `Similarity (vs #${selectedRefIdx})`
                  : 'Similarity'}
              </th>
              <th className="py-2.5 px-4">Top Terms</th>
              <th className="py-2.5 px-4">Dims</th>
              <th className="py-2.5 px-4">Vector Sparkline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayedChunks.map((chunk) => {
              const topTerms = extractTopTerms(chunk.content, 3);
              const isSelectedRef = selectedRefIdx === chunk.chunk_index;

              // Compute real cosine similarity if reference selected & embeddings exist
              let simScore = 0;
              let simPercent = 0;
              let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
              let progressFill = 'bg-slate-400';

              if (hasEmbeddings && selectedRefIdx !== null) {
                if (isSelectedRef) {
                  simScore = 1.0;
                } else if (chunk.embedding && refEmbedding) {
                  simScore = cosineSimilarity(chunk.embedding, refEmbedding);
                }

                simPercent = Math.round(Math.max(0, Math.min(1, simScore)) * 100);

                if (isSelectedRef) {
                  badgeStyle = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
                  progressFill = 'bg-purple-600';
                } else if (simScore >= 0.75) {
                  badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                  progressFill = 'bg-emerald-500';
                } else if (simScore >= 0.50) {
                  badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
                  progressFill = 'bg-indigo-500';
                }
              }

              return (
                <tr
                  key={chunk.id}
                  className={`transition-colors ${
                    isSelectedRef ? 'bg-purple-50/50' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Chunk # with Jump Link */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">Chunk #{chunk.chunk_index}</span>
                      <button
                        onClick={() => handleJump(chunk.chunk_index)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded font-semibold flex items-center space-x-1"
                        title={`Scroll to Chunk #${chunk.chunk_index} in Document Chunks panel`}
                      >
                        <span>Jump</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>

                  {/* Similarity Metric Cell */}
                  <td className="py-2.5 px-4">
                    {hasEmbeddings ? (
                      selectedRefIdx === null ? (
                        /* Default State: Interactive Compare Button */
                        <button
                          onClick={() => setSelectedRefIdx(chunk.chunk_index)}
                          className="text-[10px] text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 px-2 py-0.5 rounded font-medium flex items-center space-x-1 transition-colors"
                          title="Click to set this chunk as reference for semantic comparison"
                        >
                          <Target className="w-3 h-3 text-purple-600" />
                          <span>Compare</span>
                        </button>
                      ) : (
                        /* Active Comparison State */
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border ${badgeStyle} cursor-pointer inline-flex items-center space-x-1`}
                            onClick={() => setSelectedRefIdx(chunk.chunk_index)}
                            title="Click to select this chunk as reference"
                          >
                            <span>{isSelectedRef ? '100% (Selected)' : `${simPercent}%`}</span>
                            {!isSelectedRef && <Target className="w-2.5 h-2.5 text-slate-400 hover:text-slate-700" />}
                          </span>

                          {/* Mini visual bar indicator */}
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${progressFill} transition-all duration-300`}
                              style={{ width: `${isSelectedRef ? 100 : simPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    ) : (
                      /* Embeddings Pending State */
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>

                  {/* Top Terms */}
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {topTerms.length > 0 ? (
                        topTerms.map((term, i) => (
                          <span
                            key={i}
                            className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded"
                          >
                            {term}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">n/a</span>
                      )}
                    </div>
                  </td>

                  {/* Dims */}
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                    {activeDocument.embedding_dimensions || 384} dims
                  </td>

                  {/* Sparkline */}
                  <td className="py-2.5 px-4">
                    {hasEmbeddings ? (
                      <VectorSparkline
                        vector={chunk.embedding}
                        similarity={selectedRefIdx !== null ? simScore : 0.6}
                        globalMin={globalBounds.min}
                        globalMax={globalBounds.max}
                      />
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show More / Show Less Toggle Button */}
      {totalChunks > initialRowsCount && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-1.5 rounded-lg transition-all"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Less (First 10 Rows)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show All {totalChunks} Rows</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
