import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import SearchPage from './components/SearchPage';
import UploadPage from './components/UploadPage';
import BulkUploadPage from './components/BulkUploadPage'; // Add this import
import LoginPage from './components/LoginPage';
import UserManagementPage from './components/UserManagementPage';
import { AuthProvider, useAuth } from './components/AuthContext';
import ExportPage from './components/ExportPage';

import './index.css';

// Protected Route component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  const token = localStorage.getItem('token');
  
  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check for specific role if required
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Role-specific protected routes
const SuperAdminRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="SUPERADMIN">
      {children}
    </ProtectedRoute>
  );
};

const InstituteRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="INSTITUTE">
      {children}
    </ProtectedRoute>
  );
};

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            } 
          />
          {/* Add Bulk Upload Route */}
          <Route 
            path="/upload/bulk" 
            element={
              <ProtectedRoute>
                <BulkUploadPage />
              </ProtectedRoute>
            } 
          />
         < Route 
  path="/export" 
  element={
    <ProtectedRoute>
      <ExportPage />
    </ProtectedRoute>
  } 
/>

          <Route 
            path="/admin" 
            element={
              <SuperAdminRoute>
                <UserManagementPage />
              </SuperAdminRoute>
            } 
          />
          {/* Catch all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;