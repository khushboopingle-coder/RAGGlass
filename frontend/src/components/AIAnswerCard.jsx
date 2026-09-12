import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Bot, Copy, Check, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

export const AIAnswerCard = () => {
  const { queryResult } = useProject();
  const [copied, setCopied] = useState(false);

  if (!queryResult || !queryResult.ai_answer) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(queryResult.ai_answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAiConnected = queryResult.ollama_connected;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">AI ANSWER</h2>
            <p className="text-[11px] text-slate-500">
              Grounded response from the AI service
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAiConnected ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Grounded Context
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" /> AI Service Offline
            </span>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            title="Copy answer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isAiConnected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl mb-4 flex items-center space-x-2.5">
          <Cpu className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">AI service is temporarily unavailable.</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Your document upload, chunking, embeddings, and vector retrieval remain fully functional!
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
        {queryResult.ai_answer}
      </div>
    </div>
  );
};