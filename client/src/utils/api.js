const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('gitstat_token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  return response;
}
