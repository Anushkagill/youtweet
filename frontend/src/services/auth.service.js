import { httpClient } from './http'

export async function login({ identifier, password }) {
  const isEmail = identifier.includes('@')
  const payload = isEmail
    ? { email: identifier, password }
    : { username: identifier, password }

  const response = await httpClient.post('/api/v1/users/login', payload)
  return response.data
}

export async function fetchCurrentUser() {
  const response = await httpClient.get('/api/v1/users/current-user')
  return response.data
}

export async function logout() {
  const response = await httpClient.post('/api/v1/users/logout')
  return response.data
}

export async function registerUser(payload) {
  const formData = new FormData()

  formData.append('username', payload.username)
  formData.append('email', payload.email)
  formData.append('fullName', payload.fullName)
  formData.append('password', payload.password)
  formData.append('avatar', payload.avatar)

  if (payload.coverImage) {
    formData.append('coverImage', payload.coverImage)
  }

  const response = await httpClient.post('/api/v1/users/register', formData)
  return response.data
}