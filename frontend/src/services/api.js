import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ragglass_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const projectAPI = {
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
  createProject: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },
  getProject: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },
  deleteProject: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
};

export const documentAPI = {
  uploadDocument: async (projectId, formData) => {
    const response = await api.post(`/projects/${projectId}/documents`, formData);
    return response.data;
  },
  processText: async (projectId, textData) => {
    const response = await api.post(`/projects/${projectId}/process`, textData);
    return response.data;
  },
  chunkUpload: async (projectId, formData) => {
    const response = await api.post(`/projects/${projectId}/chunk-upload`, formData);
    return response.data;
  },
  chunkText: async (projectId, textData) => {
    const response = await api.post(`/projects/${projectId}/chunk-text`, textData);
    return response.data;
  },
  generateEmbeddings: async (projectId, documentId) => {
    const response = await api.post(`/projects/${projectId}/embed`, { document_id: documentId });
    return response.data;
  },
  getDocuments: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/documents`);
    return response.data;
  },
  deleteDocuments: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}/documents`);
    return response.data;
  },
  deleteDocument: async (projectId, documentId) => {
    const response = await api.delete(`/projects/${projectId}/documents/${documentId}`);
    return response.data;
  },
};

export const ragAPI = {
  query: async (projectId, queryData) => {
    const response = await api.post(`/projects/${projectId}/query`, queryData);
    return response.data;
  },
};

export const ollamaAPI = {
  getStatus: async () => {
    const response = await api.get('/ollama/status');
    return response.data;
  },
};

export default api;
