const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const refreshAccessToken = async () => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;

  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem('access_token', data.access);
  return data.access;
};

export const apiFetch = async (endpoint, options = {}) => {
  const buildHeaders = (token) => ({
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  });

  let token = localStorage.getItem('access_token');
  let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers: buildHeaders(token) });

  if (response.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      response = await fetch(`${API_URL}${endpoint}`, { ...options, headers: buildHeaders(token) });
    }
  }

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/';
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || 'Ошибка запроса');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

export const loginRequest = async (username, password) => {
  const response = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Неверный логин или пароль');
  }

  return response.json();
};
