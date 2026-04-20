import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { httpClient } from '../services/http'
import {
  createUserPlaylist,
  fetchPlaylistById,
  fetchProfilePlaylists,
} from '../services/profile.service'
import { getApiErrorMessage } from '../utils/apiError'

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-video animate-pulse bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
      No playlists yet. Create your first playlist.
    </div>
  )
}

function CreatePlaylistModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim() || creating) {
      return
    }

    const optimisticPlaylist = {
      _id: `temp-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      totalVideos: 0,
      thumbnail: '',
      createdAt: new Date().toISOString(),
      _optimistic: true,
    }

    setCreating(true)

    try {
      await onCreate(optimisticPlaylist, {
        name: name.trim(),
        description: description.trim(),
      })

      setName('')
      setDescription('')
      onClose()
    } catch (error) {
      console.error('Failed to create playlist:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Create Playlist</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Playlist name"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PlaylistsPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [playlists, setPlaylists] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingById, setDeletingById] = useState({})

  const sortedPlaylists = useMemo(
    () => [...playlists].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [playlists],
  )

  const loadPlaylists = useCallback(async () => {
    setLoading(true)

    try {
      const queryParams = { limit: 30 }

      if (filter === 'my') {
        if (!currentUser?._id) {
          setPlaylists([])
          return
        }

        queryParams.userId = currentUser._id
      }

      const response = await fetchProfilePlaylists(queryParams)
      const basePlaylists = response.playlists || []

      const playlistsWithThumbnails = await Promise.all(
        basePlaylists.map(async (playlist) => {
          if (!playlist?._id || !playlist.totalVideos) {
            return { ...playlist, thumbnail: '' }
          }

          try {
            const details = await fetchPlaylistById(playlist._id)
            const thumbnail = details.playlist?.videos?.[0]?.thumbnail || ''
            return { ...playlist, thumbnail }
          } catch (error) {
            console.error(`Failed to fetch details for playlist ${playlist._id}:`, error)
            return { ...playlist, thumbnail: '' }
          }
        }),
      )

      setPlaylists(playlistsWithThumbnails)
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
      setPlaylists([])
    } finally {
      setLoading(false)
    }
  }, [filter, currentUser?._id])

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  async function handleCreatePlaylist(optimisticPlaylist, payload) {
    setPlaylists((prev) => [optimisticPlaylist, ...prev])

    try {
      const response = await createUserPlaylist(payload)
      const created = response.playlist

      if (!created?._id) {
        throw new Error('Playlist not returned from API')
      }

      setPlaylists((prev) =>
        prev.map((item) =>
          item._id === optimisticPlaylist._id
            ? {
                ...created,
                thumbnail: '',
              }
            : item,
        ),
      )
    } catch (error) {
      setPlaylists((prev) => prev.filter((item) => item._id !== optimisticPlaylist._id))
      throw error
    }
  }

  async function handleDeletePlaylist(playlistId) {
    if (!playlistId || deletingById[playlistId]) {
      return
    }

    setDeletingById((prev) => ({ ...prev, [playlistId]: true }))

    try {
      await httpClient.delete(`/playlists/${playlistId}`)
      setPlaylists((prev) => prev.filter((item) => item._id !== playlistId))
      toast.success('Playlist deleted')
    } catch (err) {
      console.error('Delete playlist error:', err)
      toast.error(getApiErrorMessage(err, 'Could not delete playlist'))
    } finally {
      setDeletingById((prev) => ({ ...prev, [playlistId]: false }))
    }
  }

  async function handleTogglePlaylistPrivacy(playlistId) {
    if (!playlistId) {
      return
    }

    const prevPlaylists = playlists

    setPlaylists((prev) =>
      prev.map((item) =>
        item._id === playlistId
          ? {
              ...item,
              isPublic: !item.isPublic,
            }
          : item,
      ),
    )

    try {
      const res = await httpClient.patch(`/playlists/toggle-public-status/${playlistId}`)

      if (res.data?.data?.isPublic !== undefined) {
        setPlaylists((prev) =>
          prev.map((item) =>
            item._id === playlistId
              ? {
                  ...item,
                  isPublic: res.data.data.isPublic,
                }
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
    <section className="mx-auto max-w-2xl space-y-5 lg:max-w-5xl">
      <header className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">Playlists</h1>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('my')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                filter === 'my'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
        >
          Create Playlist
        </button>
      </header>

      {loading ? <LoadingGrid /> : null}
      {!loading && sortedPlaylists.length === 0 ? <EmptyState /> : null}

      {!loading && sortedPlaylists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedPlaylists.map((playlist) => {
            const isOwner =
              String(playlist.owner?._id || playlist.owner) ===
              String(currentUser?._id)

            return (
              <article
                key={playlist._id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {isOwner && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePlaylistPrivacy(playlist._id)
                      }}
                      className={`px-2 py-1 text-xs text-white rounded ${
                        playlist.isPublic ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    >
                      {playlist.isPublic ? ' Public' : ' Private'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlaylist(playlist._id)
                      }}
                      disabled={Boolean(deletingById[playlist._id])}
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingById[playlist._id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/playlist/${playlist._id}`)}
                  className="w-full text-left"
                >
                  {playlist.thumbnail ? (
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.name || 'Playlist'}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-video grid place-items-center bg-linear-to-br from-slate-100 to-slate-200 text-xs font-medium text-slate-500">
                      No Thumbnail
                    </div>
                  )}

                  <div className="space-y-1 p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {playlist.name || 'Untitled playlist'}
                    </h3>
                    <p className="line-clamp-2 text-xs text-slate-600">{playlist.description || 'No description'}</p>
                    <p className="pt-1 text-xs text-slate-500">{playlist.totalVideos ?? 0} videos</p>
                  </div>
                </button>
              </article>
            )
          })}
        </div>
      ) : null}

      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />
    </section>
  )
}
