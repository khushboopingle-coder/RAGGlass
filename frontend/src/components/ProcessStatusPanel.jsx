import React from 'react';
import { useProject } from '../context/ProjectContext';
import { CheckCircle2, Circle, Loader2, XCircle, Database, Cpu, FileText, Hash, Activity } from 'lucide-react';

export const ProcessStatusPanel = () => {
  const { pipelineState, activeDocument, queryResult } = useProject();

  const getStatusIcon = (statusKey) => {
    const st = pipelineState[statusKey] || 'none';
    if (st === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (st === 'in_progress') return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
    if (st === 'failed') return <XCircle className="w-4 h-4 text-rose-500" />;
    return <Circle className="w-4 h-4 text-slate-300" />;
  };

  const steps = [
    { label: 'Document loaded', key: 'document' },
    { label: 'Text extracted', key: 'document' },
    { label: 'Chunks created', key: 'chunk' },
    { label: 'Embeddings generated', key: 'embed' },
    { label: 'Vector store ready', key: 'store' },
    { label: 'Query executed', key: 'query' },
    { label: 'AI Answer generated', key: 'answer' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
      {/* Status Header */}
      <div>
        <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase flex items-center gap-2 pb-3 border-b border-slate-100">
          <Activity className="w-4 h-4 text-indigo-600" />
          PROCESS STATUS
        </h3>
        
        {/* Checklist */}
        <div className="space-y-3 mt-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">{step.label}</span>
              {getStatusIcon(step.key)}
            </div>
          ))}
        </div>
      </div>

      {/* Real Statistics Card */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 tracking-wider uppercase flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          DOCUMENT STATISTICS
        </h4>

        {activeDocument ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" /> Document Name
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={activeDocument.filename}>
                {activeDocument.filename}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" /> Characters
              </span>
              <span className="font-mono font-semibold text-slate-800">
                {activeDocument.char_count.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" /> Total Chunks
              </span>
              <span className="font-semibold text-indigo-600">
                {activeDocument.chunk_count}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-400" /> Embedding Model
              </span>
              <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                {activeDocument.embedding_model}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Dimensions</span>
              <span className="font-mono font-semibold text-slate-800">
                {activeDocument.embedding_dimensions || 384} dims
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">Vector DB Status</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> ChromaDB Ready
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic text-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No document processed yet.
          </div>
        )}
      </div>
    </div>
  );
};
