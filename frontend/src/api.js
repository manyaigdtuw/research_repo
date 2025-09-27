
// api.js
import axios from "axios";

const API_BASE = "http://localhost:8000"; // Remove /api from base URL
//const API_BASE = "https://c84ece130d6d.ngrok-free.app";


// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const register = (userData) => api.post("/api/auth/register", userData);
export const login = (credentials) => api.post("/api/auth/login", credentials);
export const checkAuth = () => api.get("/api/auth/me");

// Project API
export const createProject = (projectData) => api.post("/api/projects", projectData);
export const getProjects = () => api.get("/api/projects");



export const uploadResearchPaper = (formData, config = {}) => api.post("/api/upload", formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
});

export const searchPapers = (query, top_k = 10) => {
  return api.get("/api/search", { params: { query, top_k } });
};

export const getAllPapers = () => api.get("/api/papers");
export const getPaper = (paperId) => api.get(`/api/papers/${paperId}`);
export const deletePaper = (paperId) => api.delete(`/api/papers/${paperId}`);
export const downloadPaper = (paperId) => {
  return api.get(`/api/download/${paperId}`, { responseType: 'blob' });
};

export default api;