import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || `${API_BASE_URL}/auth/callback`;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure axios to always send cookies for local dev
  axios.defaults.withCredentials = true;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('gitstat_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/me`, {
        headers: getAuthHeaders(),
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginWithGithub = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&redirect_uri=${apiUrl}/auth/callback`;
  };

  const logout = () => {
    localStorage.removeItem('gitstat_token');
    // Backend logout route clears the cookie
    window.location.href = `${API_BASE_URL}/auth/logout`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGithub, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
