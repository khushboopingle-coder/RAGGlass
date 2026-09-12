import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectAPI, documentAPI, ragAPI, ollamaAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [queryResult, setQueryResult] = useState(null);

  const [ollamaStatus, setOllamaStatus] = useState({
    connected: false,
    url: 'http://localhost:11434',
    model: 'llama3.2:3b',
    message: 'Checking status...'
  });

  const [pipelineState, setPipelineState] = useState({
    document: 'none', // none, in_progress, completed, failed
    chunk: 'none',
    embed: 'none',
    store: 'none',
    query: 'none',
    answer: 'none',
  });

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  // Poll Ollama status periodically
  const fetchOllamaStatus = useCallback(async () => {
    try {
      const status = await ollamaAPI.getStatus();
      setOllamaStatus(status);
    } catch (err) {
      setOllamaStatus({
        connected: false,
        url: 'http://localhost:11434',
        model: 'llama3.2:3b',
        message: 'Ollama service offline or unreachable.'
      });
    }
  }, []);

  useEffect(() => {
    fetchOllamaStatus();
    const interval = setInterval(fetchOllamaStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchOllamaStatus]);

  // Load Projects on Auth
  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingProjects(true);
    try {
      const data = await projectAPI.getProjects();
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, [isAuthenticated, activeProject]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      setProjects([]);
      setActiveProject(null);
      setDocuments([]);
      setActiveDocument(null);
      setQueryResult(null);
    }
  }, [isAuthenticated, fetchProjects]);

  // Fetch documents whenever active project changes
  const fetchProjectDocuments = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      const docs = await documentAPI.getDocuments(projectId);
      setDocuments(docs);
      if (docs.length > 0) {
        const latestDoc = docs[0];
        setActiveDocument(latestDoc);
        const isDone = latestDoc.vector_status === 'completed';
        setPipelineState({
          document: 'completed',
          chunk: 'completed',
          embed: isDone ? 'completed' : 'none',
          store: isDone ? 'completed' : 'none',
          query: 'none',
          answer: 'none',
        });
      } else {
        setActiveDocument(null);
        setPipelineState({
          document: 'none',
          chunk: 'none',
          embed: 'none',
          store: 'none',
          query: 'none',
          answer: 'none',
        });
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, []);

  useEffect(() => {
    if (activeProject) {
      setQueryResult(null);
      fetchProjectDocuments(activeProject.id);
    }
  }, [activeProject, fetchProjectDocuments]);

  const selectProject = (project) => {
    setActiveProject(project);
  };

  const createProject = async (projectData) => {
    const newProj = await projectAPI.createProject(projectData);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
    return newProj;
  };

  const deleteProject = async (projectId) => {
    await projectAPI.deleteProject(projectId);
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      if (activeProject && activeProject.id === projectId) {
        const nextActive = remaining.length > 0 ? remaining[0] : null;
        setActiveProject(nextActive);
        if (!nextActive) {
          setDocuments([]);
          setActiveDocument(null);
          setQueryResult(null);
          setPipelineState({
            document: 'none',
            chunk: 'none',
            embed: 'none',
            store: 'none',
            query: 'none',
            answer: 'none',
          });
        }
      }
      return remaining;
    });
  };

  const clearDocument = async () => {
    if (!activeProject) return;
    try {
      await documentAPI.deleteDocuments(activeProject.id);
    } catch (err) {
      console.error('Error clearing project documents:', err);
    } finally {
      setDocuments([]);
      setActiveDocument(null);
      setQueryResult(null);
      setPipelineState({
        document: 'none',
        chunk: 'none',
        embed: 'none',
        store: 'none',
        query: 'none',
        answer: 'none',
      });
      fetchProjects();
    }
  };

  // Step 1: Create Chunks Only
  const createChunks = async (type, payload) => {
    if (!activeProject) throw new Error('No active project selected.');
    setIsProcessing(true);
    setQueryResult(null);

    setPipelineState({
      document: 'in_progress',
      chunk: 'none',
      embed: 'none',
      store: 'none',
      query: 'none',
      answer: 'none',
    });

    try {
      let docResult;
      if (type === 'upload') {
        docResult = await documentAPI.chunkUpload(activeProject.id, payload);
      } else {
        docResult = await documentAPI.chunkText(activeProject.id, payload);
      }

      await new Promise((r) => setTimeout(r, 200));
      setPipelineState({
        document: 'completed',
        chunk: 'completed',
        embed: 'none',
        store: 'none',
        query: 'none',
        answer: 'none',
      });

      setActiveDocument(docResult);
      setDocuments([docResult]);
      fetchProjects();
      return docResult;
    } catch (err) {
      setPipelineState({
        document: 'failed',
        chunk: 'failed',
        embed: 'none',
        store: 'none',
        query: 'none',
        answer: 'none',
      });
      const errMsg = err.response?.data?.detail || err.message || 'Chunk creation failed.';
      throw new Error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Generate Embeddings & Store in ChromaDB
  const generateEmbeddings = async () => {
    if (!activeProject) throw new Error('No active project selected.');
    if (!activeDocument) throw new Error('No document chunks created yet.');
    setIsEmbedding(true);

    setPipelineState((prev) => ({
      ...prev,
      embed: 'in_progress',
      store: 'none',
    }));

    try {
      const docResult = await documentAPI.generateEmbeddings(activeProject.id, activeDocument.id);

      await new Promise((r) => setTimeout(r, 300));
      setPipelineState((prev) => ({
        ...prev,
        embed: 'completed',
        store: 'in_progress',
      }));

      await new Promise((r) => setTimeout(r, 300));
      setPipelineState((prev) => ({
        ...prev,
        embed: 'completed',
        store: 'completed',
      }));

      setActiveDocument(docResult);
      setDocuments([docResult]);
      fetchProjects();
      return docResult;
    } catch (err) {
      setPipelineState((prev) => ({
        ...prev,
        embed: 'failed',
        store: 'failed',
      }));
      const errMsg = err.response?.data?.detail || err.message || 'Embedding generation failed.';
      throw new Error(errMsg);
    } finally {
      setIsEmbedding(false);
    }
  };

  // Process Document (Upload or Paste)
  const processDocument = async (type, payload) => {
    if (!activeProject) throw new Error('No active project selected.');
    setIsProcessing(true);
    setQueryResult(null);

    setPipelineState({
      document: 'in_progress',
      chunk: 'none',
      embed: 'none',
      store: 'none',
      query: 'none',
      answer: 'none',
    });

    try {
      let docResult;
      if (type === 'upload') {
        docResult = await documentAPI.uploadDocument(activeProject.id, payload);
      } else {
        docResult = await documentAPI.processText(activeProject.id, payload);
      }

      setPipelineState((prev) => ({ ...prev, document: 'completed', chunk: 'in_progress' }));
      
      // Artificial step timing visual feedback for maximum observability UX
      await new Promise((r) => setTimeout(r, 400));
      setPipelineState((prev) => ({ ...prev, chunk: 'completed', embed: 'in_progress' }));

      await new Promise((r) => setTimeout(r, 400));
      setPipelineState((prev) => ({ ...prev, embed: 'completed', store: 'in_progress' }));

      await new Promise((r) => setTimeout(r, 400));
      setPipelineState((prev) => ({ ...prev, store: 'completed' }));

      setActiveDocument(docResult);
      setDocuments((prev) => [docResult, ...prev]);
      
      // refresh project list doc counts
      fetchProjects();
      return docResult;
    } catch (err) {
      setPipelineState({
        document: 'failed',
        chunk: 'failed',
        embed: 'failed',
        store: 'failed',
        query: 'none',
        answer: 'none',
      });
      const errMsg = err.response?.data?.detail || err.message || 'Document processing failed.';
      throw new Error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute RAG Query
  const executeQuery = async (question, topK = 3) => {
    if (!activeProject) throw new Error('No active project selected.');
    if (!activeDocument) throw new Error('No document processed in this project yet.');

    setIsQuerying(true);
    setPipelineState((prev) => ({ ...prev, query: 'in_progress', answer: 'none' }));

    try {
      const result = await ragAPI.query(activeProject.id, { question, top_k: topK });
      
      setPipelineState((prev) => ({
        ...prev,
        query: 'completed',
        answer: result.ollama_connected ? 'completed' : 'failed'
      }));

      setQueryResult(result);
      return result;
    } catch (err) {
      setPipelineState((prev) => ({
        ...prev,
        query: 'failed',
        answer: 'failed'
      }));
      const errMsg = err.response?.data?.detail || err.message || 'Query execution failed.';
      throw new Error(errMsg);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        documents,
        activeDocument,
        queryResult,
        pipelineState,
        ollamaStatus,
        loadingProjects,
        isProcessing,
        isEmbedding,
        isQuerying,
        selectProject,
        createProject,
        deleteProject,
        clearDocument,
        createChunks,
        generateEmbeddings,
        processDocument,
        executeQuery,
        fetchOllamaStatus,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
