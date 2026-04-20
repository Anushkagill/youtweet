import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createTweet, deleteTweet, fetchAllTweets } from '../services/tweet.service'

const MAX_TWEET_LENGTH = 280

function formatTweetDate(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function sortTweetsByNewest(tweets) {
  return [...tweets].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime()
    const bTime = new Date(b?.createdAt || 0).getTime()
    return bTime - aTime
  })
}

export function TweetsPage() {
  const { user: currentUser } = useAuth()

  const [tweets, setTweets] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [deletingById, setDeletingById] = useState({})

  useEffect(() => {
    let active = true

    async function loadTweets() {
      setLoading(true)
      try {
        const response = await fetchAllTweets({ limit: 50 })
        if (!active) return
        setTweets(sortTweetsByNewest(response.tweets || []))
      } catch (error) {
        console.error('Failed to fetch tweets:', error)
        if (!active) return
        setTweets([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadTweets()

    return () => {
      active = false
    }
  }, [])

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
      owner: currentUser,
      editableStatus: true,
    }

    setPosting(true)
    setContent('')
    setTweets((prev) => sortTweetsByNewest([optimisticTweet, ...prev]))

    try {
      const response = await createTweet({ content: trimmedContent })

      setTweets((prev) => {
        const replaced = prev.map((tweet) =>
          tweet._id === tempId ? response.tweet : tweet
        )
        return sortTweetsByNewest(replaced)
      })
    } catch (error) {
      console.error('Failed to create tweet:', error)
      setTweets((prev) => prev.filter((tweet) => tweet._id !== tempId))
      setContent(trimmedContent)
    } finally {
      setPosting(false)
    }
  }

  async function handleDeleteTweet(tweetId) {
    if (!tweetId || deletingById[tweetId]) return

    const previousTweets = tweets
    setDeletingById((prev) => ({ ...prev, [tweetId]: true }))
    setTweets((prev) => prev.filter((tweet) => tweet._id !== tweetId))

    try {
      await deleteTweet(tweetId)
    } catch (error) {
      console.error('Failed to delete tweet:', error)
      setTweets(previousTweets)
    } finally {
      setDeletingById((prev) => ({ ...prev, [tweetId]: false }))
    }
  }

  const remainingChars = MAX_TWEET_LENGTH - content.length
  const canTweet = content.trim().length > 0 && content.length <= MAX_TWEET_LENGTH && !posting
  const visibleTweets = useMemo(() => sortTweetsByNewest(tweets), [tweets])

  return (
    <section className="mx-auto max-w-2xl space-y-5">

      {/* CREATE */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">Create Tweet</h1>

        <form onSubmit={handleCreateTweet} className="mt-3 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_TWEET_LENGTH))}
            placeholder="What's happening?"
            rows={4}
            className="w-full rounded-xl border p-3"
          />

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{remainingChars} left</span>
            <button
              disabled={!canTweet}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Tweet'}
            </button>
          </div>
        </form>
      </article>

      {/* TWEETS */}
      {visibleTweets.map((tweet) => {
        const canDelete =
          tweet.editableStatus ||
          currentUser?._id === tweet.owner?._id

        return (
          <article key={tweet._id} className="bg-white p-4 rounded-xl shadow hover:shadow-md">

            {/* USER INFO */}
            <div className="flex items-center gap-3 mb-2">
              <img
                src={tweet.owner?.avatar || "https://via.placeholder.com/40"}
                alt={tweet.owner?.username || 'User'}
                onError={(event) => {
                  event.currentTarget.src = '/default-avatar.png'
                }}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-semibold">
                {tweet.owner?.username || "User"}
              </span>
            </div>

            {/* CONTENT */}
            <p className="text-gray-800">{tweet.content}</p>

            {/* FOOTER */}
            <div className="flex justify-between mt-3 text-sm text-gray-500">
              <span>{formatTweetDate(tweet.createdAt)}</span>

              {canDelete && (
                <button
                  onClick={() => handleDeleteTweet(tweet._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}