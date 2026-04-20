import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { InputField } from '../components/common/InputField'
import { registerUser, login } from '../services/auth.service' // ✅ IMPORT LOGIN
import { getApiErrorMessage } from '../utils/apiError'
import { setStoredToken } from '../utils/tokenStorage' // ✅ IF YOU HAVE THIS

export function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const avatarPreview = useMemo(() => (avatar ? URL.createObjectURL(avatar) : ''), [avatar])
  const coverPreview = useMemo(() => (coverImage ? URL.createObjectURL(coverImage) : ''), [coverImage])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [avatarPreview, coverPreview])

  function validateForm() {
    const nextErrors = {}

    if (!username.trim()) nextErrors.username = 'Username is required'
    if (!email.trim()) nextErrors.email = 'Email is required'
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required'
    if (!password.trim()) nextErrors.password = 'Password is required'
    if (!avatar) nextErrors.avatar = 'Avatar is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      toast.error('Please fill all required fields.')
      return
    }

    setSubmitting(true)

    try {
      // ✅ STEP 1: REGISTER
      const response = await registerUser({
        username: username.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        avatar,
        coverImage,
      })

      toast.success(response?.message || 'Account created successfully')

      // ✅ STEP 2: AUTO LOGIN
      const loginResponse = await login({
        identifier: email.trim(), // email or username both ok
        password,
      })

      // ✅ STEP 3: STORE TOKEN
      const accessToken = loginResponse?.data?.accessToken

      if (accessToken) {
        setStoredToken(accessToken) // OR localStorage.setItem("accessToken", accessToken)
      }

      // ✅ STEP 4: REDIRECT TO HOME
      navigate('/', { replace: true })

    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Registration failed'))
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="mt-5 text-4xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-gray-400">Start your creator journey in a few quick steps.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <InputField
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourusername"
            error={errors.username}
            leadingIcon="👤"
            labelClassName="text-gray-300"
            inputClassName="bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-300 focus:text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <InputField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={errors.email}
            leadingIcon="✉"
            labelClassName="text-gray-300"
            inputClassName="bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-300 focus:text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <InputField
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            error={errors.fullName}
            leadingIcon="🪪"
            labelClassName="text-gray-300"
            inputClassName="bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-300 focus:text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <InputField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a secure password"
            error={errors.password}
            leadingIcon="🔒"
            labelClassName="text-gray-300"
            inputClassName="bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-300 focus:text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <div className="space-y-3 rounded-xl border border-gray-700 bg-[#1F2937] p-4">
            <label className="block text-sm font-semibold text-gray-200">Avatar (required)</label>

            <input
              id="avatarInput"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
              className="hidden"
            />

            <label
              htmlFor="avatarInput"
              className="inline-flex cursor-pointer items-center rounded-xl border border-gray-600 bg-[#111827] px-4 py-2 text-sm font-medium text-gray-200 transition duration-200 hover:bg-[#0f172a]"
            >
              Upload Avatar
            </label>

            <p className="text-xs text-gray-400">{avatar ? `Selected: ${avatar.name}` : 'No file selected'}</p>

            {errors.avatar ? <p className="text-xs text-rose-300">{errors.avatar}</p> : null}

            {avatarPreview ? (
              <div className="rounded-xl border border-gray-700 bg-[#111827] p-3">
                <img src={avatarPreview} alt="Avatar preview" className="h-20 w-20 rounded-full object-cover" />
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-gray-700 bg-[#1F2937] p-4">
            <label className="block text-sm font-semibold text-gray-200">Cover Image (optional)</label>

            <input
              id="coverImageInput"
              type="file"
              accept="image/*"
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              className="hidden"
            />

            <label
              htmlFor="coverImageInput"
              className="inline-flex cursor-pointer items-center rounded-xl border border-gray-600 bg-[#111827] px-4 py-2 text-sm font-medium text-gray-200 transition duration-200 hover:bg-[#0f172a]"
            >
              Upload Cover Image
            </label>

            <p className="text-xs text-gray-400">{coverImage ? `Selected: ${coverImage.name}` : 'No file selected'}</p>

            {coverPreview ? (
              <div className="overflow-hidden rounded-xl border border-gray-700 bg-[#111827] p-2">
                <img src={coverPreview} alt="Cover preview" className="h-28 w-full rounded-lg object-cover" />
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : 'Register'}
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-400">
          Already have account?{' '}
          <Link to="/login" className="font-medium text-blue-400 transition hover:text-blue-300">
            Login
          </Link>
        </p>
      </section>
    </main>
  )
}