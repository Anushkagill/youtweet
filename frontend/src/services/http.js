import axios from "axios";
import { clearStoredToken, getStoredToken } from '../utils/tokenStorage'

// ✅ create instance with backend URL
const axiosInstance = axios.create({
  baseURL: "https://youtweet-backend-wbqh.onrender.com", // 🔥 put your real backend URL
  withCredentials: true,
})

// ✅ use same instance as httpClient
export const httpClient = axiosInstance

// ✅ attach token automatically
httpClient.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// ✅ handle unauthorized globally
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredToken()

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)