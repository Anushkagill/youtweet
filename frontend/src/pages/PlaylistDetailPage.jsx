import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchPlaylistById, removeVideoFromPlaylist } from '../services/profile.service'
import { getApiErrorMessage } from '../utils/apiError'

function PlaylistDetailSkeleton() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-video animate-pulse bg-slate-200" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
      This playlist has no videos yet.
    </div>
  )
}

export function PlaylistDetailPage() {
  const { playlistId } = useParams()
  const navigate = useNavigate()

  const [playlist, setPlaylist] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingById, setRemovingById] = useState({})

  useEffect(() => {
    if (!playlistId) return

    let active = true

    async function loadPlaylist() {
      setLoading(true)
      setError('')

      try {
        const response = await fetchPlaylistById(playlistId)
        if (!active) return

        setPlaylist(response.playlist || null)
        setVideos(response.playlist?.videos || [])
      } catch (err) {
        console.error('Failed to fetch playlist details:', err)
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load playlist.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPlaylist()

    return () => {
      active = false
    }
  }, [playlistId])

  async function handleRemoveVideo(videoId) {
    if (!videoId || !playlistId || removingById[videoId]) return

    const previousVideos = videos

    setRemovingById((prev) => ({ ...prev, [videoId]: true }))
    setVideos((prev) => prev.filter((video) => video._id !== videoId))

    setPlaylist((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        totalVideos: Math.max(0, (prev.totalVideos ?? previousVideos.length) - 1),
      }
    })

    try {
      const response = await removeVideoFromPlaylist(playlistId, videoId)
      toast.success(response.message || 'Video removed from playlist')
    } catch (err) {
      console.error('Failed to remove video from playlist:', err)

      setVideos(previousVideos)
      setPlaylist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          totalVideos: previousVideos.length,
        }
      })

      toast.error(getApiErrorMessage(err, 'Could not remove video.'))
    } finally {
      setRemovingById((prev) => ({ ...prev, [videoId]: false }))
    }
  }

  if (loading) return <PlaylistDetailSkeleton />

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* HEADER */}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {playlist?.name || 'Playlist'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {playlist?.description || 'No description.'}
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          Total videos: {playlist?.totalVideos ?? videos.length}
        </p>
      </header>

      {/* EMPTY */}
      {videos.length === 0 && <EmptyState />}

      {/* VIDEOS */}
      {videos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video._id}
              onClick={() => navigate(`/video/${video._id}`)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm cursor-pointer transition hover:shadow-md"
            >
              <img
                src={video.thumbnail}
                alt={video.title || 'Video thumbnail'}
                className="aspect-video w-full object-cover"
              />

              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                  {video.title || 'Untitled video'}
                </p>

                {/* REMOVE BUTTON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()   // ⭐ IMPORTANT
                    handleRemoveVideo(video._id)
                  }}
                  disabled={Boolean(removingById[video._id])}
                  className="mt-3 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removingById[video._id] ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}