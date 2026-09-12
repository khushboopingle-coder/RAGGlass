import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Upload, FileText, Settings, Loader2, FileCheck, CheckCircle2, AlertCircle, Trash2, Layers, Sparkles } from 'lucide-react';

export const DocumentInput = () => {
  const { activeProject, activeDocument, createChunks, generateEmbeddings, clearDocument, isProcessing, isEmbedding } = useProject();
  const [activeTab, setActiveTab] = useState('paste'); // 'upload' or 'paste'
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!activeProject) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Active Project Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Please create or select a project from the left sidebar to start uploading and processing documents.
        </p>
      </div>
    );
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete this document and clear its vector embeddings?')) {
      setError(null);
      setSuccessMsg(null);
      setPastedText('');
      setFile(null);
      try {
        await clearDocument();
        setSuccessMsg('Document and vector embeddings cleared successfully.');
      } catch (err) {
        setError(err.message || 'Failed to clear document.');
      }
    }
  };

  const handleCreateChunks = async () => {
    setError(null);
    setSuccessMsg(null);

    if (activeTab === 'upload') {
      if (!file) {
        setError('Please select a PDF or TXT file to upload.');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chunk_size', chunkSize);
      formData.append('chunk_overlap', chunkOverlap);

      try {
        const doc = await createChunks('upload', formData);
        setSuccessMsg(`Document "${doc.filename}" split into ${doc.chunk_count} chunks. Click "Generate Embeddings" next.`);
        setFile(null);
      } catch (err) {
        setError(err.message);
      }
    } else {
      if (!pastedText.trim()) {
        setError('Please paste document text before chunking.');
        return;
      }

      try {
        const doc = await createChunks('paste', {
          text: pastedText,
          filename: 'Pasted Document',
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
        });
        setSuccessMsg(`Document text split into ${doc.chunk_count} chunks. Click "Generate Embeddings" next.`);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleGenerateEmbeddingsAction = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const doc = await generateEmbeddings();
      setSuccessMsg(`Generated 384-dim dense vector embeddings for ${doc.chunk_count} chunks and populated ChromaDB vector store.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const hasChunks = activeDocument && activeDocument.chunks && activeDocument.chunks.length > 0;
  const isEmbeddingsDone = activeDocument && activeDocument.vector_status === 'completed';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header & Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            DOCUMENT INPUT & WORKFLOW
          </h2>
          <p className="text-xs text-slate-500">Provide document text, create text chunks, and generate ChromaDB vector embeddings.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'paste'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-lg flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'upload' ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 bg-slate-50/50 transition-colors">
            <input
              type="file"
              accept=".pdf,.txt"
              id="file-upload-input"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-sm font-semibold text-slate-800">
                {file ? file.name : 'Click to upload PDF or TXT document'}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports PDF and plain text (.txt) files'}
              </span>
            </label>
          </div>
        ) : (
          <div>
            <textarea
              rows={6}
              placeholder="Paste your document text here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">
              Character Count: <span className="font-semibold text-slate-700">{pastedText.length}</span>
            </div>
          </div>
        )}

        {/* Controls: Chunking Configuration & Split Action Buttons */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-6 w-full md:w-auto">
            <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
              <Settings className="w-4 h-4 text-indigo-500" />
              <span>Params:</span>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-600">Chunk Size:</label>
              <input
                type="number"
                min={100}
                max={2000}
                step={50}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-600">Overlap:</label>
              <input
                type="number"
                min={0}
                max={500}
                step={10}
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className="w-16 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-wrap gap-y-2">
            {(activeDocument || file || pastedText) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isProcessing || isEmbedding}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 text-xs disabled:opacity-50"
                title="Clear current document & vectors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}

            {/* Step 1: Create Chunks */}
            <button
              onClick={handleCreateChunks}
              disabled={isProcessing || isEmbedding}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-1.5 text-xs disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Chunking...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>1. Create Chunks</span>
                </>
              )}
            </button>

            {/* Step 2: Generate Embeddings */}
            <button
              onClick={handleGenerateEmbeddingsAction}
              disabled={!hasChunks || isProcessing || isEmbedding || isEmbeddingsDone}
              className={`font-semibold px-4 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 text-xs ${
                isEmbeddingsDone
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : hasChunks
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={
                isEmbeddingsDone
                  ? 'Embeddings already generated in ChromaDB'
                  : hasChunks
                  ? 'Generate 384-dim dense vectors in ChromaDB'
                  : 'Create chunks first before generating embeddings'
              }
            >
              {isEmbedding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Embedding...</span>
                </>
              ) : isEmbeddingsDone ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vectors Ready</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Generate Embeddings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
