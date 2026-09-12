import React from 'react';
import { useProject } from '../context/ProjectContext';
import { CheckCircle2, Loader2, XCircle, Circle, ArrowRight } from 'lucide-react';

const STEPS = [
  { key: 'document', label: 'DOCUMENT', desc: 'Text Extracted' },
  { key: 'chunk', label: 'CHUNK', desc: 'Splitting Text' },
  { key: 'embed', label: 'EMBED', desc: 'all-MiniLM-L6-v2' },
  { key: 'store', label: 'STORE', desc: 'ChromaDB' },
  { key: 'query', label: 'QUERY', desc: 'Vector Search' },
  { key: 'answer', label: 'ANSWER', desc: 'AI Generated' },
];

export const PipelineBar = () => {
  const { pipelineState } = useProject();

  const renderIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Circle className="w-4 h-4 text-slate-600" />;
    }
  };

  const renderBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300';
      case 'in_progress':
        return 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300 ring-2 ring-indigo-500/30';
      case 'failed':
        return 'bg-rose-950/40 border-rose-500/30 text-rose-300';
      default:
        return 'bg-slate-950/30 border-slate-800 text-slate-500';
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 shadow-inner">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
        {STEPS.map((step, idx) => {
          const status = pipelineState[step.key] || 'none';
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${renderBadgeClass(
                  status
                )}`}
              >
                {renderIcon(status)}
                <div>
                  <span className="font-bold tracking-wide">{step.label}</span>
                  <span className="hidden lg:inline-block ml-2 text-[10px] opacity-75">
                    ({step.desc})
                  </span>
                </div>
              </div>

              {!isLast && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
