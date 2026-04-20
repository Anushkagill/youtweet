import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { InputField } from '../components/common/InputField'
import { useAuth } from '../hooks/useAuth'
import { httpClient } from '../services/http'
import { setStoredToken } from '../utils/tokenStorage'

export function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const { login, formatAuthError, setUser, setCurrentToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = location.state?.from || '/'

  function validate() {
    const nextErrors = {}

    if (!identifier.trim()) {
      nextErrors.identifier = 'Username or email is required'
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)
    setGlobalError('')

    try {
      await login(identifier.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setGlobalError(formatAuthError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const credential = credentialResponse?.credential

      if (!credential) {
        setGlobalError('Google sign-in failed. Missing credential token.')
        return
      }

      const response = await httpClient.post('/users/google-login', { credential })

      const payload = response?.data

      const accessToken = payload?.data?.accessToken
      const user = payload?.data?.user

      if (!accessToken) {
        setGlobalError('Google sign-in failed. Missing access token.')
        return
      }

      if (!user?._id) {
        setGlobalError('Google sign-in failed. Missing user details.')
        return
      }

      setStoredToken(accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('user', JSON.stringify(user))
      setCurrentToken(accessToken)
      setUser(user)
      navigate('/profile', { replace: true })
    } catch (error) {
      console.error('Google login error:', error)
      setGlobalError('Google sign-in failed. Please try again.')
    }
  }

  function handleGoogleError() {
    setGlobalError('Google sign-in failed. Please try again.')
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#0B0F19] px-4 py-10"
      style={{
        backgroundImage: 'radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 60%)',
      }}
    >
      <section className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl backdrop-blur-md sm:p-8">
        <div className="mb-8">
          <p className="text-3xl font-bold tracking-wide">
            <span className="mr-2">◉</span>
            <span className="bg-linear-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">YouTweet</span>
          </p>
          <h1 className="mt-5 text-4xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to continue to your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <InputField
            id="identifier"
            label="Username or Email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="john or john@example.com"
            autoComplete="username"
            error={errors.identifier}
            leadingIcon="✉"
            labelClassName="text-gray-300"
            inputClassName="bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-300 focus:text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <InputField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password}
            leadingIcon="🔒"
            labelClassName="text-gray-300"
            inputClassName="bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-300 focus:text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {globalError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {globalError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : 'Login'}
          </button>

          <div className="pt-2">
            <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-gray-700" />
              <span>or continue with</span>
              <span className="h-px flex-1 bg-gray-700" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            </div>
          </div>
        </form>

        <p className="mt-5 text-sm text-gray-400">
          New here?{' '}
          <Link to="/register" className="font-medium text-blue-400 transition hover:text-blue-300">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  )
}
