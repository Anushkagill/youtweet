import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'
import { httpClient } from '../../services/http'
import {
  fetchPlaylistById,
  fetchProfilePlaylists,
} from '../../services/profile.service'
import { getApiErrorMessage } from '../../utils/apiError'
import { CreatePlaylistModal } from './CreatePlaylistModal'

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-600">
      No playlists found.
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-video animate-pulse bg-slate-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PlaylistGrid({ userId }) {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const isOwner = Boolean(
    currentUser?._id && userId && String(currentUser._id) === String(userId),
  )

  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingById, setDeletingById] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadPlaylists = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError('')

    try {
      const response = await fetchProfilePlaylists({ userId, limit: 24 })
      const basePlaylists = response.playlists

      const withThumbnail = await Promise.all(
        basePlaylists.map(async (item) => {
          if (!item?._id || !item.totalVideos) {
            return { ...item, thumbnail: '' }
          }

          try {
            const details = await fetchPlaylistById(item._id)
            const firstVideoThumb =
              details.playlist?.videos?.[0]?.thumbnail || ''
            return { ...item, thumbnail: firstVideoThumb }
          } catch {
            return { ...item, thumbnail: '' }
          }
        }),
      )

      setPlaylists(withThumbnail)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not fetch playlists.'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  // ✅ FIXED DELETE
  async function handleDeletePlaylist(playlistId) {
    if (!playlistId || deletingById[playlistId]) return

    setDeletingById((prev) => ({ ...prev, [playlistId]: true }))

    try {
      await httpClient.delete(`/api/v1/playlists/${playlistId}`) // ✅ FIX
      setPlaylists((prev) => prev.filter((item) => item._id !== playlistId))
      toast.success('Playlist deleted')
    } catch (err) {
      console.error('Delete playlist error:', err)
      toast.error(getApiErrorMessage(err, 'Could not delete playlist.'))
    } finally {
      setDeletingById((prev) => ({ ...prev, [playlistId]: false }))
    }
  }

  // ✅ FIXED TOGGLE
  async function handleTogglePlaylistPrivacy(playlistId) {
    if (!playlistId) return

    const prevPlaylists = playlists

    setPlaylists((prev) =>
      prev.map((item) =>
        item._id === playlistId
          ? { ...item, isPublic: !item.isPublic }
          : item,
      ),
    )

    try {
      const res = await httpClient.patch(
        `/api/v1/playlists/toggle-public-status/${playlistId}` // ✅ FIX
      )

      if (res.data?.data?.isPublic !== undefined) {
        setPlaylists((prev) =>
          prev.map((item) =>
            item._id === playlistId
              ? { ...item, isPublic: res.data.data.isPublic }
              : item,
          ),
        )
      }
    } catch (err) {
      console.error(err)
      setPlaylists(prevPlaylists)
    }
  }

  return (
    <section className="space-y-4">
      {isOwner && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setIsModalOpen(true)}>
            Create Playlist
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && <SkeletonGrid />}
      {!loading && playlists.length === 0 && <EmptyState />}

      {!loading && playlists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {playlists.map((playlist) => {
            const isOwner =
              String(playlist.owner?._id || playlist.owner) ===
              String(currentUser?._id)

            return (
              <article
                key={playlist._id}
                className="relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md"
              >
                {isOwner && (
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePlaylistPrivacy(playlist._id)
                      }}
                      className={`px-2 py-1 text-xs text-white rounded ${
                        playlist.isPublic ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    >
                      {playlist.isPublic ? '🌍 Public' : '🔒 Private'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlaylist(playlist._id)
                      }}
                      className="bg-red-500 text-white px-2 py-1 text-xs rounded"
                    >
                      Delete
                    </button>
                  </div>
                )}

                <button
                  onClick={() => navigate(`/playlists/${playlist._id}`)}
                  className="w-full text-left"
                >
                  {playlist.thumbnail ? (
                    <img
                      src={playlist.thumbnail}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-video bg-gray-200 flex items-center justify-center text-xs">
                      No Thumbnail
                    </div>
                  )}

                  <div className="p-3">
                    <p className="font-semibold">{playlist.name}</p>
                    <p className="text-xs text-gray-500">
                      {playlist.totalVideos} videos
                    </p>
                  </div>
                </button>
              </article>
            )
          })}
        </div>
      )}

      {isOwner && (
        <CreatePlaylistModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadPlaylists}
        />
      )}
    </section>
  )
}