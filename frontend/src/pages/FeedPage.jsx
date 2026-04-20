import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { AddToPlaylistModal } from '../components/playlist/AddToPlaylistModal'
import { TweetList } from '../components/profile/TweetList'
import { fetchAllTweets } from '../services/tweet.service'
import { fetchVideos, toggleVideoLike } from '../services/video.service'
import { getApiErrorMessage } from '../utils/apiError'

function formatRelativeDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function VideoCard({ video, likeLoading, onOpenVideo, onToggleLike, onAddToPlaylist }) {
  const ownerName = video?.owner?.fullName || video?.owner?.username || 'Unknown creator'
  const ownerAvatar = video?.owner?.avatar || 'https://placehold.co/64x64?text=U'
  const isLiked = Boolean(video?.likedStatus)
  const likesCount = Number(video?.likesCount || 0)

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={() => onOpenVideo(video?._id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenVideo(video?._id)
        }
      }}
      className="group block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-950/50"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <div className="overflow-hidden rounded-b-none rounded-t-2xl">
        <img
          src={video?.thumbnail}
          alt={video?.title || 'Video thumbnail'}
          className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex gap-3">
          <img
            src={ownerAvatar}
            alt={ownerName}
            onError={(event) => {
              event.currentTarget.src = '/default-avatar.png'
            }}
            className="h-11 w-11 rounded-full border border-slate-200 object-cover"
          />
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 dark:text-slate-100">{video?.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ownerName}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeDate(video?.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isLiked ? 'primary' : 'ghost'}
              loading={likeLoading}
              disabled={likeLoading}
              onClick={(e) => {
                e.stopPropagation()
                onToggleLike(video._id)
              }}
              className={`rounded-full px-3 py-1 transition ${
                isLiked ? 'scale-105 bg-rose-500 text-white hover:bg-rose-600' : ''
              }`}
            >
              {isLiked ? 'Liked' : 'Like'} {likesCount}
            </Button>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              💬 {video?.commentsCount ?? 0}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onAddToPlaylist(video._id)
            }}
            className="rounded-full px-3 py-1 text-xs"
          >
            Add to Playlist
          </Button>
        </div>
      </div>
    </motion.article>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-video animate-pulse bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="flex gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
                  <div className="w-full space-y-2">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ title, onViewAll }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <button
        type="button"
        onClick={onViewAll}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        View All
      </button>
    </div>
  )
}

function EmptyVideosState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
      No trending videos right now.
    </div>
  )
}

function EmptyTweetsState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
      No latest tweets yet.
    </div>
  )
}

export function FeedPage() {
  const navigate = useNavigate()

  const [videos, setVideos] = useState([])
  const [tweets, setTweets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [likeLoadingById, setLikeLoadingById] = useState({})
  const [playlistModalVideoId, setPlaylistModalVideoId] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const [videosRes, tweetsRes] = await Promise.all([
          fetchVideos({ page: 1, limit: 6, sortBy: 'views', sortType: 'desc' }),
          fetchAllTweets({ limit: 6 }),
        ])

        if (!active) return

        setVideos(videosRes.videos || [])
        setTweets(tweetsRes.tweets || [])
      } catch (err) {
        if (!active) return
        const message = getApiErrorMessage(err, 'Could not load home feed.')
        setError(message)
        toast.error(message)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  function handleOpenVideo(id) {
    navigate(`/video/${id}`)
  }

  function handleOpenPlaylistModal(videoId) {
    setPlaylistModalVideoId(videoId)
  }

  function handleClosePlaylistModal() {
    setPlaylistModalVideoId('')
  }

  async function handleToggleLike(videoId) {
    if (likeLoadingById[videoId]) return

    const target = videos.find((v) => v._id === videoId)
    if (!target) return

    const prevLiked = target.likedStatus
    const prevCount = target.likesCount || 0

    setLikeLoadingById((p) => ({ ...p, [videoId]: true }))

    setVideos((prev) =>
      prev.map((v) =>
        v._id === videoId
          ? {
              ...v,
              likedStatus: !prevLiked,
              likesCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : v,
      ),
    )

    try {
      const response = await toggleVideoLike(videoId)

      if (typeof response?.liked === 'boolean') {
        const confirmedLiked = response.liked

        setVideos((prev) =>
          prev.map((v) => {
            if (v._id !== videoId) return v

            const wasOptimisticLiked = !prevLiked
            if (confirmedLiked === wasOptimisticLiked) {
              return v
            }

            return {
              ...v,
              likedStatus: confirmedLiked,
              likesCount: confirmedLiked ? prevCount + 1 : Math.max(0, prevCount - 1),
            }
          }),
        )
      }

      toast.success(prevLiked ? 'Removed like' : 'Video liked')
    } catch {
      setVideos((prev) =>
        prev.map((v) =>
          v._id === videoId
            ? {
                ...v,
                likedStatus: prevLiked,
                likesCount: prevCount,
              }
            : v,
        ),
      )
      toast.error('Could not update like status')
    } finally {
      setLikeLoadingById((prev) => {
        const updated = { ...prev }
        delete updated[videoId]
        return updated
      })
    }
  }

  const hasVideos = useMemo(() => videos.length > 0, [videos])
  const hasTweets = useMemo(() => tweets.length > 0, [tweets])

  return (
    <section className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="rounded-3xl border border-slate-200/80 bg-linear-to-r from-white via-sky-50 to-cyan-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Discovery Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Explore trending videos and fresh conversations in one place.
        </p>
      </motion.div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
      ) : null}

      {loading ? <FeedSkeleton /> : null}

      {!loading ? (
        <>
          <section className="space-y-4">
            <SectionHeader title="🔥 Trending Videos" onViewAll={() => navigate('/videos')} />
            {hasVideos ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    likeLoading={Boolean(likeLoadingById[video._id])}
                    onOpenVideo={handleOpenVideo}
                    onToggleLike={handleToggleLike}
                    onAddToPlaylist={handleOpenPlaylistModal}
                  />
                ))}
              </div>
            ) : (
              <EmptyVideosState />
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader title="💬 Latest Tweets" onViewAll={() => navigate('/tweets')} />
            {hasTweets ? <TweetList tweets={tweets} onTweetsChange={setTweets} /> : <EmptyTweetsState />}
          </section>
        </>
      ) : null}

      <AddToPlaylistModal
        isOpen={Boolean(playlistModalVideoId)}
        onClose={handleClosePlaylistModal}
        videoId={playlistModalVideoId}
      />
    </section>
  )
}
