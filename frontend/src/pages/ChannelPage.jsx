import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { PlaylistGrid } from '../components/profile/PlaylistGrid'
import { TweetList } from '../components/profile/TweetList'
import { VideoGrid } from '../components/profile/VideoGrid'
import { useAuth } from '../hooks/useAuth'
import {
  fetchChannelSubscribersCount,
  fetchProfileByUsername,
  fetchProfileTweets,
  fetchProfileVideos,
  toggleProfileSubscription,
} from '../services/profile.service'
import { fetchWatchHistory } from '../services/video.service'
import { getApiErrorMessage } from '../utils/apiError'

function ChannelTabs({ activeTab, setActiveTab, isOwner }) {
  const tabs = [
    { key: 'videos', label: 'Videos' },
    { key: 'tweets', label: 'Tweets' },
    { key: 'playlists', label: 'Playlists' },
    ...(isOwner ? [{ key: 'history', label: 'History' }] : []),
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-2 pt-2 shadow-sm">
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative rounded-t-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {isActive ? <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-rose-500" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-600">
      {text}
    </div>
  )
}

export function ChannelPage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [activeTab, setActiveTab] = useState('videos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [channelUser, setChannelUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [tweets, setTweets] = useState([])
  const [watchHistory, setWatchHistory] = useState([])
  const [watchHistoryLoading, setWatchHistoryLoading] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  const isOwner = useMemo(() => {
    if (!currentUser?._id || !channelUser?._id) return false
    return String(currentUser._id) === String(channelUser._id)
  }, [channelUser?._id, currentUser?._id])

  useEffect(() => {
    if (!isOwner && activeTab === 'history') {
      setActiveTab('videos')
    }
  }, [activeTab, isOwner])

  useEffect(() => {
    if (!username) return

    let active = true

    async function loadChannel() {
      setLoading(true)
      setError('')

      try {
        const profileResponse = await fetchProfileByUsername(username)
        if (!active) return

        const profileData = profileResponse.user
        const channelId = profileData?._id

        if (!channelId) {
          setError('Channel not found.')
          setVideos([])
          setTweets([])
          setChannelUser(null)
          return
        }

        const [videosResponse, tweetsResponse, subscribersResponse] = await Promise.all([
          fetchProfileVideos(channelId, { page: 1, limit: 24 }),
          fetchProfileTweets(channelId, { limit: 20 }),
          fetchChannelSubscribersCount(channelId),
        ])

        if (!active) return

        const fetchedVideos = videosResponse.videos || []
        const fetchedTweets = tweetsResponse.tweets || []
        const subscribersCount = subscribersResponse.subscribersCount || 0

        setChannelUser({
          ...profileData,
          subscribersCount: profileData?.subscribersCount ?? subscribersCount,
        })
        setVideos(fetchedVideos)
        setTweets(fetchedTweets)
      } catch (err) {
        if (!active) return
        setError(getApiErrorMessage(err, 'Failed to load channel.'))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadChannel()

    return () => {
      active = false
    }
  }, [username])

  async function handleToggleSubscription() {
    if (!channelUser?._id || isOwner || subscribing) return

    setSubscribing(true)

    try {
      const response = await toggleProfileSubscription(channelUser._id)
      setChannelUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          isSubscribed: Boolean(response.isSubscribed),
          subscribersCount: Number(response.subscribersCount || 0),
        }
      })
    } catch {
      // Keep current UI state when request fails.
    } finally {
      setSubscribing(false)
    }
  }

  function handleEditProfile() {
    if (!currentUser?.username) return
    navigate(`/profile/${currentUser.username}`)
  }

  function handleOpenAccountSettings() {
    if (!currentUser?.username) return
    navigate(`/profile/${currentUser.username}`)
  }

  useEffect(() => {
    if (activeTab !== 'history' || !isOwner) {
      setWatchHistory([])
      setWatchHistoryLoading(false)
      return
    }

    let active = true

    async function loadWatchHistory() {
      setWatchHistoryLoading(true)

      try {
        const response = await fetchWatchHistory({ page: 1, limit: 24 })
        if (!active) return
        const items = response.history || []
        setWatchHistory(items.map((item) => item.video).filter(Boolean))
      } catch {
        if (!active) return
        setWatchHistory([])
      } finally {
        if (active) {
          setWatchHistoryLoading(false)
        }
      }
    }

    loadWatchHistory()

    return () => {
      active = false
    }
  }, [activeTab, isOwner])

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading channel...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
  }

  if (!channelUser) {
    return <EmptyState text="Channel not found." />
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="space-y-5"
    >
      <ProfileHeader
        profile={channelUser}
        isOwnProfile={isOwner}
        onEditProfile={handleEditProfile}
        onOpenAccountSettings={handleOpenAccountSettings}
        onToggleSubscribe={handleToggleSubscription}
        isSubscribing={subscribing}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
        <span className="font-semibold text-slate-900">Subscribers: </span>
        {channelUser.subscribersCount ?? 0}
      </div>

      <ChannelTabs activeTab={activeTab} setActiveTab={setActiveTab} isOwner={isOwner} />

      {activeTab === 'videos' ? (
        videos.length ? <VideoGrid videos={videos} /> : <EmptyState text="No videos published yet." />
      ) : null}

      {activeTab === 'tweets' ? (
        tweets.length ? <TweetList tweets={tweets} /> : <EmptyState text="No tweets yet." />
      ) : null}

      {activeTab === 'playlists' ? <PlaylistGrid userId={channelUser?._id} /> : null}

      {activeTab === 'history' && isOwner ? (
        watchHistoryLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            Loading watch history...
          </div>
        ) : watchHistory.length ? (
          <VideoGrid videos={watchHistory} />
        ) : (
          <EmptyState text="No watch history yet." />
        )
      ) : null}
    </motion.section>
  )
}
