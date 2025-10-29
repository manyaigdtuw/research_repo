
// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Auth endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  ME: `${API_BASE_URL}/auth/me`,
};

// Search endpoints
export const SEARCH_ENDPOINTS = {
  SEARCH: `${API_BASE_URL}/search`,
  FILTER_OPTIONS: `${API_BASE_URL}/filters/options`,
};

// Document endpoints
export const DOCUMENT_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/upload`,
  UPLOAD_BULK: `${API_BASE_URL}/upload/bulk`,
  DOWNLOAD_TEMPLATE: `${API_BASE_URL}/upload/bulk-template`,
  DOWNLOAD: (documentId) => `${API_BASE_URL}/download/${documentId}`,
};

// User management endpoints
export const USER_ENDPOINTS = {
  USERS: `${API_BASE_URL}/users`,
  CREATE_USER: `${API_BASE_URL}/users`,
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function for file upload headers
export const getUploadHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  };
};


// Export base URL in case it's needed elsewhere
export { API_BASE_URL };
