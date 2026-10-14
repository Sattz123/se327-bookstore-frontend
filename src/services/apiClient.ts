import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

export default apiClient
