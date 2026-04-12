const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const getToken = () => localStorage.getItem('gitstat_token');

export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) {
    localStorage.removeItem('gitstat_token');
    window.location.href = '/';
    return null;
  }
  return response;
};
