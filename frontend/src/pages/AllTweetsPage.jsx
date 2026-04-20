import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createTweet, deleteTweet, fetchAllTweets, toggleTweetLike } from '../services/tweet.service'
import { createTweetReply, deleteComment, fetchTweetReplies, toggleCommentLike } from '../services/comment.service'
import { getApiErrorMessage } from '../utils/apiError'

const MAX_TWEET_LENGTH = 280

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
]

function formatTweetDate(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function sortTweets(items, sortOption) {
  const sorted = [...items]

  sorted.sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime()
    const bTime = new Date(b?.createdAt || 0).getTime()

    if (sortOption === 'oldest') {
      return aTime - bTime
    }

    return bTime - aTime
  })

  return sorted
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
      No tweets found.
    </div>
  )
}

export function AllTweetsPage() {
  const { user: currentUser } = useAuth()

  const [tweets, setTweets] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortOption, setSortOption] = useState('latest')
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [activeReplyTweetId, setActiveReplyTweetId] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [replies, setReplies] = useState({})
  const [showRepliesByTweet, setShowRepliesByTweet] = useState({})
  const [replyLoadingByTweet, setReplyLoadingByTweet] = useState({})
  const [replyPostingByTweet, setReplyPostingByTweet] = useState({})
  const [likeLoadingByTweet, setLikeLoadingByTweet] = useState({})
  const [likeLoadingByComment, setLikeLoadingByComment] = useState({})
  const [deleteLoadingByComment, setDeleteLoadingByComment] = useState({})
  const [deleteLoadingByTweet, setDeleteLoadingByTweet] = useState({})

  useEffect(() => {
    let active = true

    async function loadTweets() {
      setLoading(true)
      setError('')

      try {
        const response = await fetchAllTweets({ limit: 100 })
        if (!active) return
        setTweets(response.tweets || [])
      } catch (err) {
        if (!active) return
        setTweets([])
        setError(getApiErrorMessage(err, 'Failed to fetch tweets.'))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadTweets()

    return () => {
      active = false
    }
  }, [])

  async function loadReplies(tweetId) {
    if (!tweetId || String(tweetId).startsWith('temp-')) {
      return
    }

    if (typeof replies[tweetId] !== 'undefined' || replyLoadingByTweet[tweetId]) {
      return
    }

    setReplyLoadingByTweet((prev) => ({ ...prev, [tweetId]: true }))

    try {
      const replyItems = await fetchTweetReplies(tweetId)

      setReplies((prev) => ({
        ...prev,
        [tweetId]: Array.isArray(replyItems) ? replyItems : [],
      }))
    } catch (err) {
      console.error(`Failed to fetch tweet replies for ${tweetId}:`, err)
      setReplies((prev) => ({ ...prev, [tweetId]: [] }))
    } finally {
      setReplyLoadingByTweet((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  useEffect(() => {
    tweets.forEach((tweet) => {
      const tweetId = tweet?._id
      if (!tweetId) return
      if (typeof replies[tweetId] !== 'undefined') return
      if (replyLoadingByTweet[tweetId]) return
      loadReplies(tweetId)
    })
  }, [replyLoadingByTweet, replies, tweets])

  async function handleCreateTweet(event) {
    event.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent || posting || trimmedContent.length > MAX_TWEET_LENGTH) {
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimisticTweet = {
      _id: tempId,
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      likedStatus: false,
      likesCount: 0,
      owner: {
        _id: currentUser?._id,
        username: currentUser?.username,
        fullName: currentUser?.fullName,
        avatar: currentUser?.avatar,
      },
    }

    setPosting(true)
    setContent('')
    setTweets((prev) => [optimisticTweet, ...prev])

    try {
      const response = await createTweet({ content: trimmedContent })

      setTweets((prev) =>
        prev.map((tweet) => (tweet._id === tempId ? response.tweet || tweet : tweet)),
      )
    } catch (err) {
      setTweets((prev) => prev.filter((tweet) => tweet._id !== tempId))
      setContent(trimmedContent)
      console.error('Failed to create tweet:', err)
      setError(getApiErrorMessage(err, 'Could not create tweet.'))
    } finally {
      setPosting(false)
    }
  }

  async function handleToggleLike(tweetId) {
    if (!tweetId || likeLoadingByTweet[tweetId]) {
      return
    }

    const targetTweet = tweets.find((tweet) => tweet._id === tweetId)
    if (!targetTweet) {
      return
    }

    const prevLiked = Boolean(targetTweet.likedStatus)
    const prevCount = Number(targetTweet.likesCount || 0)

    setLikeLoadingByTweet((prev) => ({ ...prev, [tweetId]: true }))

    setTweets((prev) =>
      prev.map((tweet) =>
        tweet._id === tweetId
          ? {
              ...tweet,
              likedStatus: !prevLiked,
              likesCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : tweet,
      ),
    )

    try {
      const response = await toggleTweetLike(tweetId)

      if (typeof response?.liked === 'boolean') {
        setTweets((prev) =>
          prev.map((tweet) => {
            if (tweet._id !== tweetId) return tweet

            if (response.liked === !prevLiked) {
              return tweet
            }

            return {
              ...tweet,
              likedStatus: response.liked,
              likesCount: response.liked ? prevCount + 1 : Math.max(0, prevCount - 1),
            }
          }),
        )
      }
    } catch (err) {
      setTweets((prev) =>
        prev.map((tweet) =>
          tweet._id === tweetId
            ? {
                ...tweet,
                likedStatus: prevLiked,
                likesCount: prevCount,
              }
            : tweet,
        ),
      )
      console.error('Failed to toggle tweet like:', err)
    } finally {
      setLikeLoadingByTweet((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  async function handleOpenReply(tweetId) {
    if (activeReplyTweetId === tweetId) {
      setActiveReplyTweetId('')
      setReplyContent('')
      return
    }

    setActiveReplyTweetId(tweetId)
    setReplyContent('')
  }

  function handleToggleReplies(tweetId) {
    setShowRepliesByTweet((prev) => ({
      ...prev,
      [tweetId]: !(prev[tweetId] ?? true),
    }))
  }

  async function handleSubmitReply(tweetId) {
    const trimmedReply = replyContent.trim()
    if (!tweetId || !trimmedReply || replyPostingByTweet[tweetId]) {
      return
    }

    setReplyPostingByTweet((prev) => ({ ...prev, [tweetId]: true }))

    try {
      const createdReply = await createTweetReply(tweetId, trimmedReply)

      if (createdReply) {
        setReplies((prev) => ({
          ...prev,
          [tweetId]: [
            {
              ...createdReply,
              likedStatus: Boolean(createdReply?.likedStatus),
              likesCount: Number(createdReply?.likesCount || 0),
            },
            ...(prev[tweetId] || []),
          ],
        }))
      }

      setReplyContent('')
    } catch (err) {
      console.error('Failed to post tweet reply:', err)
    } finally {
      setReplyPostingByTweet((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  async function handleToggleReplyLike(tweetId, commentId) {
    if (!tweetId || !commentId || likeLoadingByComment[commentId]) {
      return
    }

    const targetReply = (replies[tweetId] || []).find((reply) => reply._id === commentId)
    if (!targetReply) {
      return
    }

    const prevLiked = Boolean(targetReply.likedStatus)
    const prevCount = Number(targetReply.likesCount || 0)

    setLikeLoadingByComment((prev) => ({ ...prev, [commentId]: true }))

    setReplies((prev) => ({
      ...prev,
      [tweetId]: (prev[tweetId] || []).map((reply) =>
        reply._id === commentId
          ? {
              ...reply,
              likedStatus: !prevLiked,
              likesCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : reply,
      ),
    }))

    try {
      const response = await toggleCommentLike(commentId)

      if (typeof response?.liked === 'boolean') {
        setReplies((prev) => ({
          ...prev,
          [tweetId]: (prev[tweetId] || []).map((reply) => {
            if (reply._id !== commentId) return reply

            if (response.liked === !prevLiked) {
              return reply
            }

            return {
              ...reply,
              likedStatus: response.liked,
              likesCount: response.liked ? prevCount + 1 : Math.max(0, prevCount - 1),
            }
          }),
        }))
      }
    } catch (err) {
      setReplies((prev) => ({
        ...prev,
        [tweetId]: (prev[tweetId] || []).map((reply) =>
          reply._id === commentId
            ? {
                ...reply,
                likedStatus: prevLiked,
                likesCount: prevCount,
              }
            : reply,
        ),
      }))
      console.error('Failed to toggle comment like:', err)
    } finally {
      setLikeLoadingByComment((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  async function handleDeleteTweet(tweetId) {
    if (!tweetId || deleteLoadingByTweet[tweetId]) {
      return
    }

    const targetIndex = tweets.findIndex((tweet) => tweet._id === tweetId)
    if (targetIndex < 0) {
      return
    }

    const targetTweet = tweets[targetIndex]
    if (String(targetTweet?.owner?._id) !== String(currentUser?._id)) {
      return
    }

    const previousReplies = replies[tweetId]
    const previousShowReplies = showRepliesByTweet[tweetId]
    const previousReplyLoading = replyLoadingByTweet[tweetId]
    const previousReplyPosting = replyPostingByTweet[tweetId]

    setDeleteLoadingByTweet((prev) => ({ ...prev, [tweetId]: true }))

    setTweets((prev) => prev.filter((tweet) => tweet._id !== tweetId))
    setReplies((prev) => {
      const next = { ...prev }
      delete next[tweetId]
      return next
    })
    setShowRepliesByTweet((prev) => {
      const next = { ...prev }
      delete next[tweetId]
      return next
    })
    setReplyLoadingByTweet((prev) => {
      const next = { ...prev }
      delete next[tweetId]
      return next
    })
    setReplyPostingByTweet((prev) => {
      const next = { ...prev }
      delete next[tweetId]
      return next
    })
    setActiveReplyTweetId((prev) => (prev === tweetId ? '' : prev))

    try {
      await deleteTweet(tweetId)
    } catch (err) {
      setTweets((prev) => {
        const alreadyRestored = prev.some((tweet) => tweet._id === tweetId)
        if (alreadyRestored) {
          return prev
        }

        const next = [...prev]
        const insertAt = Math.min(targetIndex, next.length)
        next.splice(insertAt, 0, targetTweet)
        return next
      })
      setReplies((prev) => ({
        ...prev,
        [tweetId]: previousReplies,
      }))
      setShowRepliesByTweet((prev) => ({
        ...prev,
        [tweetId]: previousShowReplies,
      }))
      setReplyLoadingByTweet((prev) => ({
        ...prev,
        [tweetId]: previousReplyLoading,
      }))
      setReplyPostingByTweet((prev) => ({
        ...prev,
        [tweetId]: previousReplyPosting,
      }))
      console.error('Failed to delete tweet:', err)
    } finally {
      setDeleteLoadingByTweet((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  async function handleDeleteReply(tweetId, commentId) {
    if (!tweetId || !commentId || deleteLoadingByComment[commentId]) {
      return
    }

    const currentReplies = replies[tweetId] || []
    const targetIndex = currentReplies.findIndex((reply) => reply._id === commentId)

    if (targetIndex < 0) {
      return
    }

    const targetReply = currentReplies[targetIndex]

    if (String(targetReply?.owner?._id) !== String(currentUser?._id)) {
      return
    }

    setDeleteLoadingByComment((prev) => ({ ...prev, [commentId]: true }))

    setReplies((prev) => ({
      ...prev,
      [tweetId]: (prev[tweetId] || []).filter((reply) => reply._id !== commentId),
    }))

    try {
      await deleteComment(commentId)
    } catch (err) {
      setReplies((prev) => {
        const existing = prev[tweetId] || []
        const alreadyRestored = existing.some((reply) => reply._id === commentId)
        if (alreadyRestored) {
          return prev
        }

        const restored = [...existing]
        const insertAt = Math.min(targetIndex, restored.length)
        restored.splice(insertAt, 0, targetReply)

        return {
          ...prev,
          [tweetId]: restored,
        }
      })
      console.error('Failed to delete reply:', err)
    } finally {
      setDeleteLoadingByComment((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  const sortedTweets = useMemo(() => sortTweets(tweets, sortOption), [tweets, sortOption])
  const remainingChars = MAX_TWEET_LENGTH - content.length
  const canSubmit = content.trim().length > 0 && !posting

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">All Tweets</h1>
          <p className="mt-1 text-sm text-slate-600">Twitter-style timeline with sorting.</p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="tweet-sort" className="text-sm font-medium text-slate-700">
            Sort by
          </label>
          <select
            id="tweet-sort"
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

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create Tweet</h2>

        <form onSubmit={handleCreateTweet} className="mt-3 space-y-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, MAX_TWEET_LENGTH))}
            placeholder="What's happening?"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
          />

          <div className="flex items-center justify-between gap-3">
            <p className={`text-xs ${remainingChars < 20 ? 'text-rose-600' : 'text-slate-500'}`}>
              {remainingChars} characters left
            </p>

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {posting ? 'Posting...' : 'Tweet'}
            </button>
          </div>
        </form>
      </article>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}
      {!loading && sortedTweets.length === 0 ? <EmptyState /> : null}

      {!loading && sortedTweets.length > 0 ? (
        <div className="space-y-3">
          {sortedTweets.map((tweet) => (
            <article
              key={tweet._id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">@{tweet.owner?.username || 'unknown'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500">{formatTweetDate(tweet.createdAt)}</p>
                  {String(tweet.owner?._id) === String(currentUser?._id) ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteTweet(tweet._id)}
                      disabled={Boolean(deleteLoadingByTweet[tweet._id])}
                      className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleteLoadingByTweet[tweet._id] ? 'Deleting...' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{tweet.content}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleLike(tweet._id)}
                  disabled={Boolean(likeLoadingByTweet[tweet._id])}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    tweet.likedStatus
                      ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ❤️ {tweet.likesCount ?? 0}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReply(tweet._id)}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  Reply
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleReplies(tweet._id)}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  {(showRepliesByTweet[tweet._id] ?? true) ? 'Hide Replies' : 'Show Replies'}
                </button>
              </div>

              {activeReplyTweetId === tweet._id ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <textarea
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder="Write a reply"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSubmitReply(tweet._id)}
                      disabled={!replyContent.trim() || Boolean(replyPostingByTweet[tweet._id])}
                      className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {replyPostingByTweet[tweet._id] ? 'Replying...' : 'Reply'}
                    </button>
                  </div>
                </div>
              ) : null}

              {(showRepliesByTweet[tweet._id] ?? true) ? (
                <div className="mt-3 space-y-2 pl-4">
                  {replyLoadingByTweet[tweet._id] ? (
                    <p className="text-xs text-slate-500">Loading replies...</p>
                  ) : (replies[tweet._id] || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No replies yet.</p>
                  ) : (
                    (replies[tweet._id] || []).map((reply) => (
                      <div key={reply._id} className="rounded-md bg-gray-100 p-2">
                        <p className="text-xs font-semibold text-slate-700">
                          @{reply.owner?.username || 'Unknown user'}
                        </p>
                        <p className="mt-1 text-sm text-slate-800">{reply.content}</p>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleReplyLike(tweet._id, reply._id)}
                            disabled={Boolean(likeLoadingByComment[reply._id])}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              reply.likedStatus
                                ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            ❤️ {reply.likesCount ?? 0}
                          </button>

                          {String(reply.owner?._id) === String(currentUser?._id) ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteReply(tweet._id, reply._id)}
                              disabled={Boolean(deleteLoadingByComment[reply._id])}
                              className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deleteLoadingByComment[reply._id] ? 'Deleting...' : 'Delete'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
