import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'
import { fetchChannelSubscribersCount, fetchProfileByUsername, toggleProfileSubscription } from '../services/profile.service'
import { createVideoComment, deleteComment, fetchVideoComments, toggleCommentLike } from '../services/comment.service'
import { addToWatchHistory, deleteVideo, fetchVideoById, toggleVideoLike, toggleVideoPublish } from '../services/video.service'
import { getApiErrorMessage } from '../utils/apiError'

function VideoDetailSkeleton() {
  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="aspect-video animate-pulse bg-slate-200" />
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-7 w-3/5 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
        <div className="h-24 animate-pulse rounded bg-slate-100" />
      </div>
    </section>
  )
}

export function VideoDetailPage() {
  const { videoId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const hasFetched = useRef(false)
  const previousVideoId = useRef('')

  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLiking, setIsLiking] = useState(false)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasNextPage, setCommentsHasNextPage] = useState(false)
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false)
  const [commentLikeLoadingById, setCommentLikeLoadingById] = useState({})
  const [commentDeleteLoadingById, setCommentDeleteLoadingById] = useState({})
  const [videoDeleting, setVideoDeleting] = useState(false)
  const [publishToggling, setPublishToggling] = useState(false)
  const [channelSubscribed, setChannelSubscribed] = useState(false)
  const [channelSubscribersCount, setChannelSubscribersCount] = useState(0)
  const [channelSubscribing, setChannelSubscribing] = useState(false)
  const channelOwnerId = video?.owner?._id || video?.ownerofvideo?._id
  const channelOwnerUsername = video?.owner?.username

  async function fetchVideo() {
    try {
      const res = await fetchVideoById(videoId)
      const videoData = res.video

      setVideo(videoData)

      const ownerId = videoData?.owner?._id || videoData?.ownerofvideo?._id
      const ownerUsername = videoData?.owner?.username

      if (ownerId) {
        const subscribersResponse = await fetchChannelSubscribersCount(ownerId)
        setChannelSubscribersCount(Number(subscribersResponse.subscribersCount || 0))
      }

      if (ownerUsername) {
        const ownerProfileResponse = await fetchProfileByUsername(ownerUsername)
        setChannelSubscribed(Boolean(ownerProfileResponse.user?.isSubscribed))
        if (typeof ownerProfileResponse.user?.subscribersCount === 'number') {
          setChannelSubscribersCount(ownerProfileResponse.user.subscribersCount)
        }
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to load video')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 LOAD VIDEO (single guarded trigger)
  useEffect(() => {
    if (!videoId) return

    if (previousVideoId.current !== videoId) {
      hasFetched.current = false
      previousVideoId.current = videoId
    }

    if (hasFetched.current) return

    hasFetched.current = true
    setLoading(true)
    setError('')
    fetchVideo()
  }, [videoId])

  // SAVE WATCH HISTORY (non-blocking)
  useEffect(() => {
    if (!videoId) return

    addToWatchHistory(videoId).catch((err) => {
      console.error('Failed to save watch history:', err)
    })
  }, [videoId])

  // 🔥 LOAD COMMENTS
  useEffect(() => {
    async function loadComments() {
      try {
        setCommentsLoading(true)
        setCommentsError('')

        const res = await fetchVideoComments(videoId, { page: 1, limit: 10 })
        setComments(res.comments)
        setCommentsPage(res.pagination.page)
        setCommentsHasNextPage(res.pagination.hasNextPage)
      } catch (err) {
        const message = getApiErrorMessage(err, 'Failed to load comments')
        setCommentsError(message)
        toast.error(message)
      } finally {
        setCommentsLoading(false)
      }
    }
    if (videoId) loadComments()
  }, [videoId])

  // 🔥 LIKE HANDLER
  async function handleToggleLike() {
    if (!video || isLiking) return

    const prevLiked = video.likedStatus
    const prevCount = video.likesCount || 0

    setIsLiking(true)

    // optimistic update
    setVideo((prev) => ({
      ...prev,
      likedStatus: !prevLiked,
      likesCount: prevLiked ? prevCount - 1 : prevCount + 1,
    }))

    try {
      await toggleVideoLike(video._id)
      toast.success(prevLiked ? 'Removed like' : 'Video liked')
    } catch (err) {
      // rollback
      setVideo((prev) => ({
        ...prev,
        likedStatus: prevLiked,
        likesCount: prevCount,
      }))
      toast.error(getApiErrorMessage(err, 'Could not update like status'))
    } finally {
      setIsLiking(false)
    }
  }

  // 🔥 COMMENT SUBMIT
  async function handleSubmitComment(e) {
    e.preventDefault()
    const content = newComment.trim()
    if (!content) return

    setCommentSubmitting(true)

    try {
      const res = await createVideoComment(videoId, content)

      if (res.comment) {
        setComments((prev) => {
          const exists = prev.find((c) => c._id === res.comment._id)
          if (exists) return prev
          return [res.comment, ...prev]
        })

        setVideo((prev) => ({
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1,
        }))
      }

      setNewComment('')
      toast.success('Comment posted')
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not post comment')
      setCommentsError(message)
      toast.error(message)
    } finally {
      setCommentSubmitting(false)
    }
  }

  async function handleLoadMoreComments() {
    if (commentsLoading || commentsLoadingMore || !commentsHasNextPage) {
      return
    }

    setCommentsLoadingMore(true)
    setCommentsError('')

    try {
      const nextPage = commentsPage + 1
      const res = await fetchVideoComments(videoId, { page: nextPage, limit: 10 })

      setComments((prev) => {
        const existing = new Set(prev.map((item) => item._id))
        const incoming = res.comments.filter((item) => !existing.has(item._id))
        return [...prev, ...incoming]
      })
      setCommentsPage(res.pagination.page)
      setCommentsHasNextPage(res.pagination.hasNextPage)
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not load more comments.')
      setCommentsError(message)
      toast.error(message)
    } finally {
      setCommentsLoadingMore(false)
    }
  }

  async function handleToggleCommentLike(commentId) {
    if (!commentId || commentLikeLoadingById[commentId]) {
      return
    }

    const targetComment = comments.find((item) => item._id === commentId)
    if (!targetComment) {
      return
    }

    const prevLiked = Boolean(targetComment.likedStatus)
    const prevCount = Number(targetComment.likesCount || 0)

    setCommentLikeLoadingById((prev) => ({ ...prev, [commentId]: true }))

    setComments((prev) =>
      prev.map((item) =>
        item._id === commentId
          ? {
              ...item,
              likedStatus: !prevLiked,
              likesCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : item,
      ),
    )

    try {
      const response = await toggleCommentLike(commentId)

      if (typeof response?.liked === 'boolean') {
        setComments((prev) =>
          prev.map((item) => {
            if (item._id !== commentId) return item

            if (response.liked === !prevLiked) {
              return item
            }

            return {
              ...item,
              likedStatus: response.liked,
              likesCount: response.liked ? prevCount + 1 : Math.max(0, prevCount - 1),
            }
          }),
        )
      }
    } catch (err) {
      setComments((prev) =>
        prev.map((item) =>
          item._id === commentId
            ? {
                ...item,
                likedStatus: prevLiked,
                likesCount: prevCount,
              }
            : item,
        ),
      )
      toast.error(getApiErrorMessage(err, 'Could not update comment like status'))
    } finally {
      setCommentLikeLoadingById((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  async function handleDeleteComment(commentId) {
    if (!commentId || commentDeleteLoadingById[commentId]) {
      return
    }

    const targetIndex = comments.findIndex((item) => item._id === commentId)
    if (targetIndex < 0) {
      return
    }

    const targetComment = comments[targetIndex]

    if (String(targetComment?.owner?._id) !== String(currentUser?._id)) {
      return
    }

    const prevCommentsCount = Number(video?.commentsCount || 0)

    setCommentDeleteLoadingById((prev) => ({ ...prev, [commentId]: true }))

    setComments((prev) => prev.filter((item) => item._id !== commentId))
    setVideo((prev) => ({
      ...prev,
      commentsCount: Math.max(0, Number(prev?.commentsCount || 0) - 1),
    }))

    try {
      await deleteComment(commentId)
      toast.success('Comment deleted')
    } catch (err) {
      setComments((prev) => {
        const alreadyRestored = prev.some((item) => item._id === commentId)
        if (alreadyRestored) {
          return prev
        }

        const next = [...prev]
        const insertAt = Math.min(targetIndex, next.length)
        next.splice(insertAt, 0, targetComment)
        return next
      })
      setVideo((prev) => ({ ...prev, commentsCount: prevCommentsCount }))
      toast.error(getApiErrorMessage(err, 'Could not delete comment'))
    } finally {
      setCommentDeleteLoadingById((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  async function handleDeleteVideo() {
    if (!video?._id || videoDeleting) {
      return
    }

    if (String(video?.owner?._id) !== String(currentUser?._id)) {
      return
    }

    setVideoDeleting(true)

    try {
      await deleteVideo(video._id)
      toast.success('Video deleted')
      navigate('/')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete video'))
      setVideoDeleting(false)
    }
  }

  async function handleTogglePublish() {
    if (!video?._id || publishToggling) {
      return
    }

    const prevPublished = Boolean(video?.isPublished)

    setPublishToggling(true)
    setVideo((prev) => ({
      ...prev,
      isPublished: !prevPublished,
    }))

    try {
      const response = await toggleVideoPublish(video._id)

      if (typeof response?.video?.isPublished === 'boolean') {
        setVideo((prev) => ({
          ...prev,
          isPublished: response.video.isPublished,
        }))
      }
    } catch (err) {
      setVideo((prev) => ({
        ...prev,
        isPublished: prevPublished,
      }))
      toast.error(getApiErrorMessage(err, 'Could not update video visibility'))
    } finally {
      setPublishToggling(false)
    }
  }

  async function handleShareVideo() {
    if (!videoId) {
      return
    }

    const shareLink = `${window.location.origin}/video/${videoId}`

    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  async function handleToggleSubscribe() {
    const channelId = channelOwnerId
    if (!channelId || channelSubscribing || String(channelId) === String(currentUser?._id)) {
      return
    }

    setChannelSubscribing(true)

    try {
      const response = await toggleProfileSubscription(channelId)
      setChannelSubscribed(Boolean(response.isSubscribed))
      setChannelSubscribersCount(Number(response.subscribersCount || 0))
      toast.success(response.isSubscribed ? 'Subscribed' : 'Unsubscribed')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update subscription'))
    } finally {
      setChannelSubscribing(false)
    }
  }

  if (loading) return <VideoDetailSkeleton />
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="space-y-6"
    >

      {/* VIDEO */}
      <video
        src={video?.videoFile}
        controls
        poster={video?.thumbnail}
        className="w-full rounded-2xl border border-slate-200 bg-black shadow-sm dark:border-slate-800"
      />

      {/* TITLE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{video?.title}</h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareVideo}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Share
            </button>

            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={publishToggling}
              className={`rounded-md px-3 py-1 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                video?.isPublished
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
            >
              {publishToggling ? 'Updating...' : video?.isPublished ? 'Public' : 'Private'}
            </button>

            {String(video?.owner?._id) === String(currentUser?._id) ? (
              <button
                type="button"
                onClick={handleDeleteVideo}
                disabled={videoDeleting}
                className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {videoDeleting ? 'Deleting...' : 'Delete Video'}
              </button>
            ) : null}
          </div>
        </div>

        {/* LIKE */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleToggleLike}
            loading={isLiking}
            disabled={isLiking}
            variant={video?.likedStatus ? 'primary' : 'ghost'}
          >
            {video?.likedStatus ? 'Liked' : 'Like'}
          </Button>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            👍 {video?.likesCount}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            💬 {video?.commentsCount}
          </span>
        </div>

        {/* OWNER */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <div
            role="button"
            tabIndex={0}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
            onClick={() => {
              if (!channelOwnerUsername) return
              navigate(`/channel/${channelOwnerUsername}`)
            }}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && channelOwnerUsername) {
                event.preventDefault()
                navigate(`/channel/${channelOwnerUsername}`)
              }
            }}
          >
            <img
              src={video?.owner?.avatar}
              onError={(event) => {
                event.currentTarget.src = '/default-avatar.png'
              }}
              className="h-10 w-10 rounded-full object-cover"
              alt={video?.owner?.fullName || video?.owner?.username || 'Owner'}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{video?.owner?.fullName || video?.owner?.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{channelSubscribersCount} subscribers</p>
            </div>
          </div>

          {String(channelOwnerId) !== String(currentUser?._id) ? (
            <button
              type="button"
              onClick={handleToggleSubscribe}
              disabled={channelSubscribing}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                channelSubscribed
                    ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
                  : 'bg-slate-900 text-white hover:bg-slate-700'
              }`}
            >
              {channelSubscribing ? 'Updating...' : channelSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          ) : null}
        </div>

        {/* DESCRIPTION */}
        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{video?.description}</p>
      </div>

      {/* COMMENTS */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Comments</h2>

        {/* ADD COMMENT */}
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <Button
            type="submit"
            disabled={!newComment.trim() || commentSubmitting}
            loading={commentSubmitting}
          >
            Post
          </Button>
        </form>

        {/* COMMENTS LIST */}
        {commentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-3">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No comments yet</p>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {comments.map((c) => (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 transition duration-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {c.owner?.fullName || c.owner?.username}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCommentLike(c._id)}
                      disabled={Boolean(commentLikeLoadingById[c._id])}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        c.likedStatus
                          ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      ❤️ {c.likesCount ?? 0}
                    </button>

                    {String(c.owner?._id) === String(currentUser?._id) ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c._id)}
                        disabled={Boolean(commentDeleteLoadingById[c._id])}
                        className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {commentDeleteLoadingById[c._id] ? 'Deleting...' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMoreComments}
                disabled={commentsLoadingMore || !commentsHasNextPage}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {commentsLoadingMore
                  ? 'Loading more comments...'
                  : commentsHasNextPage
                    ? 'Load More Comments'
                    : 'No More Comments'}
              </button>
            </div>
          </>
        )}
      </div>

      <Link to="/">← Back</Link>
    </motion.div>
  )
}