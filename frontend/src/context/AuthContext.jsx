import { createContext, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../services/auth.service'
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/tokenStorage'
import { getApiErrorMessage } from '../utils/apiError'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      const storedToken = getStoredToken()
      const storedUser = localStorage.getItem('user')

      if (storedToken) {
        setToken(storedToken)
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem('user')
          setUser(null)
        }
      }

      if (!storedToken) {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      try {
        const response = await fetchCurrentUser()
        const currentUser = response?.data ?? null

        if (!isMounted) {
          return
        }

        setUser(currentUser)

        if (currentUser) {
          localStorage.setItem('user', JSON.stringify(currentUser))
        } else {
          localStorage.removeItem('user')
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error)

        if (!isMounted) {
          return
        }

        clearStoredToken()
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [])

  async function login(identifier, password) {
    const response = await loginRequest({ identifier, password })

    const responseToken = response?.data?.accessToken
    const loggedInUser = response?.data?.user

    if (!responseToken) {
      throw new Error('Access token missing from login response')
    }

    // store everything
    setStoredToken(responseToken)
    localStorage.setItem('user', JSON.stringify(loggedInUser))

    // update state
    setToken(responseToken)
    setUser(loggedInUser ?? null)

    return response
  }

  async function logout() {
    try {
      await logoutRequest()
    } catch {
      // ignore API failure
    }

    clearStoredToken()
    localStorage.removeItem('user')

    setToken(null)
    setUser(null)
  }

  function formatAuthError(error) {
    return getApiErrorMessage(error, 'Unable to authenticate. Please try again.')
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      setCurrentUser: setUser,
      token,
      setCurrentToken: setToken,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      formatAuthError,
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}