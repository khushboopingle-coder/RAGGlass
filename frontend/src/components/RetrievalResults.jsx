import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Database, FileText, Percent, Target } from 'lucide-react';

export const RetrievalResults = () => {
  const { queryResult } = useProject();

  if (!queryResult || !queryResult.retrieved_chunks || queryResult.retrieved_chunks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            RETRIEVED CONTEXT ({queryResult.retrieved_chunks.length} Top Chunks)
          </h2>
          <p className="text-xs text-slate-500">
            Real vector search results from ChromaDB using cosine similarity distance.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {queryResult.retrieved_chunks.map((item, idx) => {
          const simPct = (item.similarity * 100).toFixed(1);
          return (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    Chunk #{item.chunk_index}
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {item.document_filename}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    <Percent className="w-3 h-3" /> Similarity: {simPct}%
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                    <Target className="w-3 h-3 text-slate-500" /> Distance: {item.distance}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 font-mono leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80 whitespace-pre-wrap">
                "{item.content}"
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
