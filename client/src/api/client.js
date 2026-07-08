import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

const apiClient = axios.create({ baseURL: API_URL });

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export function getAuthToken() {
  return authToken;
}

export { API_URL };
export default apiClient;
