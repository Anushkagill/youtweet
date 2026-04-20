import { AppRouter } from './app/router'
import { useAuth } from './hooks/useAuth'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>
  }

  return <AppRouter />
}

export default App
