import React from 'react';
import { useProject } from '../context/ProjectContext';
import { FileText, Link, Percent } from 'lucide-react';

export const SourcesCard = () => {
  const { queryResult } = useProject();

  if (!queryResult || !queryResult.sources || queryResult.sources.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Link className="w-4 h-4 text-indigo-600" />
            SOURCES ({queryResult.sources.length} Referenced Chunks)
          </h2>
          <p className="text-xs text-slate-500">
            Trace the precise document chunks used to synthesize the AI answer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {queryResult.sources.map((src, idx) => {
          const simPct = (src.similarity * 100).toFixed(1);
          return (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded">
                  Chunk #{src.chunk_index}
                </span>
                <span className="font-mono text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {simPct}% match
                </span>
              </div>

              <p className="text-[11px] text-slate-600 line-clamp-3 font-mono bg-white p-2 rounded border border-slate-200">
                "{src.content}"
              </p>

              <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 pt-1 border-t border-slate-200">
                <FileText className="w-3 h-3 text-slate-400" /> {src.document_filename}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
