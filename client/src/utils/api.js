const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export async function apiFetch(path, options = {}) {
  console.log('API_URL:', API_URL);
  const token = localStorage.getItem('gitstat_token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  return response;
}
