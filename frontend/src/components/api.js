// api.js
import axios from "axios";

// API Base URL - Change this once to update all endpoints
const API_BASE = "http://127.0.0.1:8000";
// const API_BASE = "http://192.168.0.252:8000";
// const API_BASE = "https://c84ece130d6d.ngrok-free.app";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Upload API
export const uploadDocument = (formData) => 
  api.post("/api/upload", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// Search API
export const searchDocuments = (params) => 
  api.get("/api/search", { params });

// Browse API
export const browseDocuments = () => 
  api.get("/api/browse");

// Download API
export const downloadDocument = (documentId) => 
  api.get(`/api/download/${documentId}`, { 
    responseType: 'blob' 
  });

// Filters API
export const getFilterOptions = () => 
  api.get("/api/filters/options");

// Debug API
export const checkServerStatus = () => 
  api.get("/api/debug/faiss-status");

export const getDocumentsDebug = () => 
  api.get("/api/debug/documents");

export default api;