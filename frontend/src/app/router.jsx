import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProtectedRoute } from '../components/routing/ProtectedRoute'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { FeedPage } from '../pages/FeedPage'
import { UploadPage } from '../pages/UploadPage'
import { TweetsPage } from '../pages/TweetsPage'
import { AllTweetsPage } from '../pages/AllTweetsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { PlaylistsPage } from '../pages/PlaylistsPage'
import { PlaylistDetailPage } from '../pages/PlaylistDetailPage'
import { SubscriptionsPage } from '../pages/SubscriptionsPage'
import { VideosPage } from '../pages/VideosPage'
import { VideoDetailPage } from '../pages/VideoDetailPage'
import { ChannelPage } from '../pages/ChannelPage'

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FeedPage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="tweets" element={<TweetsPage />} />
        <Route path="all-tweets" element={<AllTweetsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="channel/:username" element={<ChannelPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlist/:playlistId" element={<PlaylistDetailPage />} />
        <Route path="playlists/:playlistId" element={<PlaylistDetailPage />} />
        <Route path="video/:videoId" element={<VideoDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
