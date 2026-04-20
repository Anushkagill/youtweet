import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '12px',
              padding: '12px 14px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>,
)
