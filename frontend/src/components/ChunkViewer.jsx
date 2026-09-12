import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

export const ChunkViewer = () => {
  const { activeDocument } = useProject();
  const [expandedChunkId, setExpandedChunkId] = useState(null);

  if (!activeDocument || !activeDocument.chunks || activeDocument.chunks.length === 0) {
    return null;
  }

  const toggleExpand = (id) => {
    setExpandedChunkId(expandedChunkId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            DOCUMENT CHUNKS ({activeDocument.chunks.length})
          </h2>
          <p className="text-xs text-slate-500">
            Inspect the exact text chunks created from your input document.
          </p>
        </div>
        <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
          Chunk Size: {activeDocument.chunk_size} | Overlap: {activeDocument.chunk_overlap}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {activeDocument.chunks.map((chunk) => {
          const isExpanded = expandedChunkId === chunk.id;
          return (
            <div
              key={chunk.id}
              id={`chunk-card-idx-${chunk.chunk_index}`}
              onClick={() => toggleExpand(chunk.id)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded shadow-2xs">
                  Chunk #{chunk.chunk_index}
                </span>

                <div className="flex items-center space-x-2 text-[10px]">
                  <span className="text-slate-500 font-mono">{chunk.char_count} chars</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Chunk Content */}
              <p
                className={`text-xs text-slate-700 leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-slate-200/80 ${
                  isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'
                }`}
              >
                "{chunk.content}"
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
