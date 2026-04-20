const TOKEN_KEY = 'youtweet_access_token'
const LEGACY_TOKEN_KEY = 'accessToken'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
}

export function setStoredToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    return
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(LEGACY_TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}
