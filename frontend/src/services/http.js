import axiosInstance from '../utils/axiosInstance'
import { clearStoredToken, getStoredToken } from '../utils/tokenStorage'

export const httpClient = axiosInstance

httpClient.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

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