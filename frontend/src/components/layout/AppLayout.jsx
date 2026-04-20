import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'

const sidebarItems = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/videos', label: 'Videos', icon: '🎬' },
  { to: '/upload', label: 'Upload', icon: '📤' },
  { to: '/all-tweets', label: 'All Tweets', icon: '🐦' },
  { to: '/subscriptions', label: 'Subscriptions', icon: '📺' },
  { to: '/playlists', label: 'Playlists', icon: '📁' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

function SidebarContent({ onNavigate }) {
  return (
    <nav className="space-y-1 px-3 py-4">
      {sidebarItems.map((item) => {
        if (item.disabled) {
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-500"
              title="Coming soon"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [query, setQuery] = useState('')
  const showSearch = location.pathname === '/' || location.pathname === '/videos'

  const displayName = useMemo(() => user?.fullName || user?.username || 'User', [user?.fullName, user?.username])
  const avatar = user?.avatar || 'https://placehold.co/64x64?text=U'

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const currentQuery = new URLSearchParams(location.search).get('query') || ''
    setQuery(currentQuery)
  }, [location.search])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')

    if (savedTheme === 'dark') {
      setIsDarkMode(true)
      return
    }

    if (savedTheme === 'light') {
      setIsDarkMode(false)
      return
    }

    setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  function handleSearchSubmit(event) {
    event.preventDefault()

    if (!query.trim()) return

    navigate(`/videos?query=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 w-full items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <Link to="/" className="shrink-0 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            You<span className="text-rose-500">Tweet</span>
          </Link>

          {showSearch ? (
            <form onSubmit={handleSearchSubmit} className="mx-auto hidden w-full max-w-xl md:block">
              <div className="flex items-center rounded-full border border-slate-300 bg-white pl-4 pr-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                >
                  Search
                </button>
              </div>
            </form>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <img
              src={avatar}
              alt={displayName}
              onError={(event) => {
                event.currentTarget.src = '/default-avatar.png'
              }}
              className="h-9 w-9 rounded-full border border-slate-200 object-cover"
            />
            <p className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 lg:block">{displayName}</p>
            <Button variant="ghost" onClick={onLogout} className="px-3 py-2 text-xs sm:text-sm">
              Logout
            </Button>
          </div>
        </div>

        {showSearch ? (
          <div className="border-t border-slate-200 px-4 pb-3 pt-2 dark:border-slate-800 md:hidden">
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center rounded-full border border-slate-300 bg-white pl-4 pr-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="h-9 w-full border-0 bg-transparent text-sm text-slate-800 outline-none dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                >
                  Go
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </header>

      <div className="flex">
        <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-60 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
          <SidebarContent />
        </aside>

        {sidebarOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 bg-slate-900/35 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar backdrop"
            />

            <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:hidden">
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        ) : null}

        <main className="w-full px-4 py-6 md:ml-60 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.26, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

    </div>
  )
}
