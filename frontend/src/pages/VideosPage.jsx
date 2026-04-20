import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { AddToPlaylistModal } from '../components/playlist/AddToPlaylistModal'
import { fetchVideos } from '../services/video.service'
import { getApiErrorMessage } from '../utils/apiError'

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'mostViewed', label: 'Most Viewed' },
]

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function getSortParams(sortOption) {
  if (sortOption === 'oldest') {
    return { sortBy: 'createdAt', sortType: 'asc' }
  }

  if (sortOption === 'mostViewed') {
    return { sortBy: 'views', sortType: 'desc' }
  }

  return { sortBy: 'createdAt', sortType: 'desc' }
}

function formatViews(value) {
  const views = Number(value || 0)

  if (views >= 1000000) {
    const millions = views / 1000000
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M views`
  }

  if (views >= 1000) {
    const thousands = views / 1000
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K views`
  }

  return `${views} views`
}

function formatTimeAgo(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diffMs = date.getTime() - Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day

  if (Math.abs(diffMs) < hour) {
    return relativeTimeFormatter.format(Math.round(diffMs / minute), 'minute')
  }

  if (Math.abs(diffMs) < day) {
    return relativeTimeFormatter.format(Math.round(diffMs / hour), 'hour')
  }

  if (Math.abs(diffMs) < month) {
    return relativeTimeFormatter.format(Math.round(diffMs / day), 'day')
  }

  if (Math.abs(diffMs) < year) {
    return relativeTimeFormatter.format(Math.round(diffMs / month), 'month')
  }

  return relativeTimeFormatter.format(Math.round(diffMs / year), 'year')
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds || 0)))
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function LoadingState() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-video animate-pulse bg-slate-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ isSearchMode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
      {isSearchMode ? 'There is no matching video yet' : 'No videos found'}
    </div>
  )
}

export function VideosPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortOption, setSortOption] = useState('latest')
  const [error, setError] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [playlistModalVideoId, setPlaylistModalVideoId] = useState('')

  const searchQuery = (searchParams.get('query') || '').trim()

  useEffect(() => {
    let active = true

    async function loadVideos() {
      const searchActive = Boolean(searchQuery)
      setIsSearchMode(searchActive)
      setLoading(true)
      setError('')

      try {
        const sortParams = getSortParams(sortOption)
        const response = await fetchVideos({ page: 1, limit: 30, ...sortParams, query: searchQuery || undefined })
        if (!active) return
        setVideos(response.videos || [])
      } catch (err) {
        if (!active) return
        setVideos([])
        setError(getApiErrorMessage(err, 'Failed to load videos.'))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadVideos()

    return () => {
      active = false
    }
  }, [searchQuery, sortOption])

  function handleAddToPlaylist(videoId) {
    setPlaylistModalVideoId(videoId)
  }

  function handleClosePlaylistModal() {
    setPlaylistModalVideoId('')
  }

  const hasVideos = useMemo(() => videos.length > 0, [videos])

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{isSearchMode ? 'Search Results' : 'Videos'}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSearchMode ? `Showing matches for "${searchQuery}".` : 'Browse all uploads with flexible sorting.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="videos-sort" className="text-sm font-medium text-slate-700">
            Sort by
          </label>
          <select
            id="videos-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}
      {!loading && !hasVideos ? <EmptyState isSearchMode={isSearchMode} /> : null}

      {!loading && hasVideos ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <article
              key={video._id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/video/${video._id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`/video/${video._id}`)
                }
              }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:scale-105 hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={video.thumbnail}
                  alt={video.title || 'Video thumbnail'}
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-2 bottom-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-medium text-white">
                  {formatDuration(video.duration)}
                </span>
              </div>

              <div className="space-y-1.5 p-3.5">
                <p className="line-clamp-2 text-sm font-bold text-slate-900">{video.title || 'Untitled video'}</p>
                <p className="text-xs text-slate-600">
                  {formatViews(video.views)} • {formatTimeAgo(video.createdAt)}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  @{video.owner?.username || 'unknown'}
                </p>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleAddToPlaylist(video._id)
                    }}
                    className="rounded-full px-3 py-1 text-xs"
                  >
                    Add to Playlist
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <AddToPlaylistModal
        isOpen={Boolean(playlistModalVideoId)}
        onClose={handleClosePlaylistModal}
        videoId={playlistModalVideoId}
      />
    </section>
  )
}
