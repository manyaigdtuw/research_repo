import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AUTH_ENDPOINTS, getAuthHeaders } from './api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Create headers manually instead of using getAuthHeaders()
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await axios.get(AUTH_ENDPOINTS.ME, { headers });
      
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setCurrentUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const refreshUser = () => {
    checkAuthStatus();
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    checkAuthStatus,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};