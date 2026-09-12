import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Search, Sparkles, Loader2, HelpCircle, AlertCircle } from 'lucide-react';

export const QuerySection = () => {
  const { activeDocument, executeQuery, isQuerying } = useProject();
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(3);
  const [error, setError] = useState(null);

  if (!activeDocument) return null;

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }

    setError(null);
    try {
      await executeQuery(question.trim(), topK);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            ASK YOUR DOCUMENT
          </h2>
          <p className="text-xs text-slate-500">
            Search ChromaDB vector store and generate a grounded answer using AI.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center space-x-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleQuery} className="space-y-4">
        <div>
          <textarea
            rows={3}
            placeholder="Ask a question about your processed document..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-700">Top K Chunks:</label>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'chunk' : 'chunks'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isQuerying}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-2.5 rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
          >
            {isQuerying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching & Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Retrieve & Answer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
