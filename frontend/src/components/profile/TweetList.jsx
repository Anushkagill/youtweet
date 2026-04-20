import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../common/Button'
import { deleteTweet, toggleTweetLike } from '../../services/tweet.service'
import { getApiErrorMessage } from '../../utils/apiError'
import { useAuth } from '../../hooks/useAuth'

function formatTimeAgo(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
  }).format(date)
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-600">
      No tweets yet.
    </div>
  )
}

export function TweetList({ tweets = [], onTweetsChange }) {
  const { user: currentUser } = useAuth()
  const [loadingLikes, setLoadingLikes] = useState({})
  const [loadingDelete, setLoadingDelete] = useState({})

  const tweetItems = useMemo(() => tweets, [tweets])

  async function handleLike(tweetId, currentLikedStatus, currentLikesCount) {
    if (loadingLikes[tweetId]) {
      return
    }

    const nextLiked = !currentLikedStatus
    const nextLikesCount = currentLikedStatus
      ? Math.max(0, (currentLikesCount || 0) - 1)
      : (currentLikesCount || 0) + 1

    onTweetsChange?.((prev) =>
      prev.map((tweet) =>
        tweet._id === tweetId
          ? { ...tweet, likedStatus: nextLiked, likesCount: nextLikesCount }
          : tweet,
      ),
    )

    setLoadingLikes((prev) => ({ ...prev, [tweetId]: true }))

    try {
      const response = await toggleTweetLike(tweetId)
      if (typeof response.liked === 'boolean') {
        onTweetsChange?.((prev) =>
          prev.map((tweet) =>
            tweet._id === tweetId
              ? { ...tweet, likedStatus: response.liked }
              : tweet,
          ),
        )
      }
    } catch (error) {
      onTweetsChange?.((prev) =>
        prev.map((tweet) =>
          tweet._id === tweetId
            ? { ...tweet, likedStatus: currentLikedStatus, likesCount: currentLikesCount }
            : tweet,
        ),
      )
      toast.error(getApiErrorMessage(error, 'Could not update like.'))
    } finally {
      setLoadingLikes((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  async function handleDelete(tweetId) {
    if (loadingDelete[tweetId]) {
      return
    }

    const previousTweets = tweetItems
    onTweetsChange?.((prev) => prev.filter((tweet) => tweet._id !== tweetId))
    setLoadingDelete((prev) => ({ ...prev, [tweetId]: true }))

    try {
      await deleteTweet(tweetId)
      toast.success('Tweet deleted')
    } catch (error) {
      onTweetsChange?.(() => previousTweets)
      toast.error(getApiErrorMessage(error, 'Could not delete tweet.'))
    } finally {
      setLoadingDelete((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  if (tweetItems.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {tweetItems.map((tweet) => {
        const canDelete = Boolean(tweet.editableStatus) || currentUser?._id === tweet.owner?._id

        return (
          <article
            key={tweet._id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{tweet.content}</p>
              <p className="shrink-0 text-xs font-medium text-slate-500">{formatTimeAgo(tweet.createdAt)}</p>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant={tweet.likedStatus ? 'primary' : 'ghost'}
                loading={Boolean(loadingLikes[tweet._id])}
                onClick={() => handleLike(tweet._id, Boolean(tweet.likedStatus), Number(tweet.likesCount || 0))}
                className="rounded-full px-3 py-1 text-xs"
              >
                {tweet.likedStatus ? 'Liked' : 'Like'}
              </Button>

              <span className="text-xs text-slate-600">{tweet.likesCount ?? 0} likes</span>

              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  loading={Boolean(loadingDelete[tweet._id])}
                  onClick={() => handleDelete(tweet._id)}
                  className="ml-auto rounded-full border-rose-200 text-xs text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
