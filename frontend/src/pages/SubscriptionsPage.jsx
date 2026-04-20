import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMySubscribedChannels, fetchSubscriptionsVideos } from '../services/subscription.service'

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function formatTimeAgo(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diffMs = date.getTime() - Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (Math.abs(diffMs) < hour) {
    return relativeTimeFormatter.format(Math.round(diffMs / minute), 'minute')
  }

  if (Math.abs(diffMs) < day) {
    return relativeTimeFormatter.format(Math.round(diffMs / hour), 'hour')
  }

  return relativeTimeFormatter.format(Math.round(diffMs / day), 'day')
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

function SubscriptionsLoadingState() {
  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-7 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200" />
      </header>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex min-w-20 flex-col items-center">
              <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-2 h-3 w-14 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-video animate-pulse bg-slate-200" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SubscriptionsPage() {
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function fetchData() {
      setLoading(true)

      try {
        const [channelRes, videoRes] = await Promise.all([
          fetchMySubscribedChannels({ page: 1, limit: 30 }),
          fetchSubscriptionsVideos({ page: 1, limit: 30 }),
        ])

        if (!active) return
        setChannels(channelRes.channels || [])
        setVideos(videoRes.videos || [])
      } catch (error) {
        console.error('Failed to load subscriptions page data:', error)
        if (!active) return
        setChannels([])
        setVideos([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <SubscriptionsLoadingState />
  }

  if (!channels.length) {
    return (
      <section className="space-y-5">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Subscriptions</h1>
        </header>
        <div className="mt-10 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg">You haven&apos;t subscribed to any channels yet.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Latest updates from channels you follow.</p>
      </header>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Your Subscriptions</h2>

        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {channels.map((channel) => (
            <button
              key={channel._id}
              type="button"
              onClick={() => navigate(`/channel/${channel.username}`)}
              className="flex min-w-20 flex-col items-center transition duration-200 hover:scale-105"
            >
              <img
                src={channel.avatar || 'https://placehold.co/96x96?text=U'}
                alt={channel.username || 'Channel'}
                onError={(event) => {
                  event.currentTarget.src = '/default-avatar.png'
                }}
                className="h-14 w-14 rounded-full border border-slate-200 object-cover"
              />
              <p className="mt-1 w-16 truncate text-center text-xs text-slate-700 dark:text-slate-300">{channel.username || 'unknown'}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Latest Videos</h2>

        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No videos from your subscriptions yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title || 'Video thumbnail'}
                  className="aspect-video w-full object-cover"
                />

                <div className="space-y-1.5 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{video.title || 'Untitled video'}</p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-400">@{video.owner?.username || 'unknown'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {formatViews(video.views)} • {formatTimeAgo(video.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
