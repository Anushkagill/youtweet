import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { ProfileTabs } from '../components/profile/ProfileTabs'
import { PlaylistGrid } from '../components/profile/PlaylistGrid'
import { TweetList } from '../components/profile/TweetList'
import { VideoGrid } from '../components/profile/VideoGrid'
import { useAuth } from '../hooks/useAuth'
import { fetchWatchHistory } from '../services/video.service'
import {
  changePassword,
  deleteAccount,
  fetchProfileByUsername,
  fetchProfileTweets,
  fetchProfileVideos,
  toggleProfileSubscription,
  updateProfile,
} from '../services/profile.service'
import { getApiErrorMessage } from '../utils/apiError'

function ProfileSkeleton() {
  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-6 w-12 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-video animate-pulse bg-slate-200" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function EmptyTabState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-600">
      {text}
    </div>
  )
}

function VideosTab({ videos }) {
  if (videos.length === 0) return <EmptyTabState text="No videos published yet." />

  return <VideoGrid videos={videos} />
}

function TweetsTab({ tweets }) {
  return <TweetList tweets={tweets} />
}

function PlaylistsTab({ userId }) {
  if (!userId) return <EmptyTabState text="No playlists created yet." />

  return <PlaylistGrid userId={userId} />
}

function HistoryTab({ loading, history, isOwnProfile, onOpenVideo }) {
  if (!isOwnProfile) {
    return <EmptyTabState text="Watch history is only visible on your own profile." />
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        Loading watch history...
      </div>
    )
  }

  if (!history.length) {
    return <EmptyTabState text="No watch history yet" />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {history.map((video) => (
        <button
          key={video._id}
          type="button"
          onClick={() => onOpenVideo(video._id)}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:shadow-md"
        >
          <img
            src={video.thumbnail}
            alt={video.title || 'Video thumbnail'}
            className="aspect-video w-full object-cover"
          />

          <div className="space-y-1 p-3">
            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{video.title || 'Untitled video'}</p>
            <p className="text-xs text-slate-600">@{video.owner?.username || 'unknown'}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

export function ProfilePage() {
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)
  const navigate = useNavigate()
  const { username: usernameParam } = useParams()
  const { user: currentUser, setUser, logout, loading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState('videos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileUser, setProfileUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [tweets, setTweets] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [editError, setEditError] = useState('')
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverImage, setCoverImage] = useState(currentUser?.coverImage || '')
  const [coverFile, setCoverFile] = useState(null)
  const resolvedUsername = usernameParam || currentUser?.username || ''
  const [formData, setFormData] = useState(() => ({
    fullName: currentUser?.fullName || '',
    username: currentUser?.username || '',
    avatar: currentUser?.avatar || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }))

  const fetchProfile = useCallback(async () => {
    if (!resolvedUsername) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const userResponse = await fetchProfileByUsername(resolvedUsername)
      const userData = userResponse.user

      if (!userData?._id) {
        throw new Error('User data missing required id')
      }

      const [videosResponse, tweetsResponse] = await Promise.all([
        fetchProfileVideos(userData._id, { page: 1, limit: 12 }),
        fetchProfileTweets(userData._id, { limit: 20 }),
      ])

      setProfileUser(userData)
      setVideos(videosResponse.videos)
      setTweets(tweetsResponse.tweets)
    } catch (err) {
      console.error('Profile fetch failed:', err)
      setError(getApiErrorMessage(err, 'Failed to load profile.'))
      setProfileUser(null)
    } finally {
      setLoading(false)
    }
  }, [resolvedUsername])

  useEffect(() => {
    if (authLoading || !currentUser?.username) {
      return
    }

    if (!usernameParam && currentUser?.username) {
      navigate(`/profile/${currentUser.username}`, { replace: true })
    }
  }, [authLoading, currentUser?.username, navigate, usernameParam])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (currentUser) {
      fetchProfile()
      return
    }

    if (!currentUser?._id) {
      setLoading(false)
      setError('')
      setProfileUser(null)
      setVideos([])
      setTweets([])
      return
    }
  }, [authLoading, currentUser, fetchProfile, resolvedUsername])

  useEffect(() => {
    if (activeTab !== 'history') {
      return
    }

    if (!profileUser?._id || !currentUser?._id || profileUser._id !== currentUser._id) {
      setHistory([])
      setHistoryLoading(false)
      return
    }

    let active = true

    async function loadHistory() {
      setHistoryLoading(true)

      try {
        const response = await fetchWatchHistory({ page: 1, limit: 30 })
        if (!active) return

        const items = response.history || []
        setHistory(items.map((item) => item.video).filter(Boolean))
      } catch {
        if (!active) return
        setHistory([])
      } finally {
        if (active) {
          setHistoryLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [activeTab, currentUser?._id, profileUser?._id])

  useEffect(() => {
    if (formData.currentPassword) {
      setPasswordError('')
    }
  }, [formData.currentPassword])

  const isOwnProfile = useMemo(() => {
    if (!currentUser?.username || !profileUser?.username) return false
    return currentUser.username.toLowerCase() === profileUser.username.toLowerCase()
  }, [currentUser?.username, profileUser?.username])

  const headerProfile = useMemo(() => {
    if (!profileUser) return profileUser
    if (!isOwnProfile) return profileUser
    return {
      ...profileUser,
      ...currentUser,
    }
  }, [currentUser, isOwnProfile, profileUser])

  function handleEditProfile() {
    const seedUser = currentUser || profileUser || {}

    setFormData({
      fullName: seedUser.fullName || '',
      username: seedUser.username || '',
      avatar: seedUser.avatar || '',
    })
    setAvatarFile(null)
    setCoverImage(seedUser.coverImage || '')
    setCoverFile(null)
    setEditError('')
    setIsEditModalOpen(true)
  }

  function handleCloseEditModal() {
    if (formData.avatar?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.avatar)
    }
    if (coverImage?.startsWith('blob:')) {
      URL.revokeObjectURL(coverImage)
    }
    setAvatarFile(null)
    setCoverFile(null)
    setEditError('')
    setIsEditModalOpen(false)
  }

  function handleAvatarChange(event) {
    const selectedFile = event.target.files?.[0] || null
    if (!selectedFile) return

    if (formData.avatar?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.avatar)
    }

    const previewUrl = URL.createObjectURL(selectedFile)
    setAvatarFile(selectedFile)
    setFormData((prev) => ({
      ...prev,
      avatar: previewUrl,
    }))
  }

  function handleCoverChange(event) {
    const selectedFile = event.target.files?.[0] || null
    if (!selectedFile) return

    if (coverImage?.startsWith('blob:')) {
      URL.revokeObjectURL(coverImage)
    }

    const previewUrl = URL.createObjectURL(selectedFile)
    setCoverFile(selectedFile)
    setCoverImage(previewUrl)
  }

  function handleRemoveCover() {
    if (coverImage?.startsWith('blob:')) {
      URL.revokeObjectURL(coverImage)
    }
    setCoverImage('')
    setCoverFile(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    setEditError('')
    setIsSavingProfile(true)

    const formDataToSend = new FormData()
    formDataToSend.append('fullName', formData.fullName || '')
    formDataToSend.append('username', formData.username || '')

    if (avatarFile) {
      formDataToSend.append('avatar', avatarFile)
    }

    if (coverFile) {
      formDataToSend.append('coverImage', coverFile)
    } else if (!coverImage) {
      formDataToSend.append('coverImage', '')
    }

    try {
      const response = await updateProfile(formDataToSend)

      const updatedUser = response.data?.data

      if (!updatedUser) {
        throw new Error('Profile update response missing user data')
      }

      setUser(updatedUser)
      setProfileUser(updatedUser)
      setAvatarFile(null)
      setCoverFile(null)
      setCoverImage(updatedUser.coverImage || '')
      toast.success(response.data?.message || 'Profile updated successfully')
      handleCloseEditModal()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to update profile.')
      console.error('Profile update failed:', err)
      setEditError(message)
      toast.error(message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleToggleSubscription() {
    if (!profileUser?._id || subscribing || isOwnProfile) {
      return
    }

    const previousValue = Boolean(profileUser.isSubscribed)
    setSubscribing(true)

    setProfileUser((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        isSubscribed: !previousValue,
      }
    })

    try {
      const response = await toggleProfileSubscription(profileUser._id)
      setProfileUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          isSubscribed: Boolean(response.subscribed),
        }
      })
      toast.success(response.message || 'Subscription updated')
    } catch (err) {
      console.error('Subscription update failed:', err)
      setProfileUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          isSubscribed: previousValue,
        }
      })
      toast.error(getApiErrorMessage(err, 'Failed to update subscription.'))
    } finally {
      setSubscribing(false)
    }
  }

  function handleOpenChangePasswordModal() {
    if (!isOwnProfile || !currentUser?._id) {
      return
    }

    setPasswordError('')
    setFormData((prev) => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }))
    setIsChangePasswordModalOpen(true)
  }

  function handleOpenAccountSettingsModal() {
    if (!isOwnProfile || !currentUser?._id) {
      return
    }

    setIsAccountSettingsModalOpen(true)
  }

  function handleCloseAccountSettingsModal() {
    if (isChangingPassword || isDeletingAccount) {
      return
    }

    setIsAccountSettingsModalOpen(false)
  }

  function handleOpenChangePasswordFromSettings() {
    setIsAccountSettingsModalOpen(false)
    handleOpenChangePasswordModal()
  }

  function handleOpenDeleteFromSettings() {
    setIsAccountSettingsModalOpen(false)
    handleOpenDeleteModal()
  }

  function handleCloseChangePasswordModal() {
    if (isChangingPassword) {
      return
    }

    setPasswordError('')
    setFormData((prev) => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }))
    setIsChangePasswordModalOpen(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formData.currentPassword || formData.currentPassword.trim() === '') {
      const message = 'Current Password is required'
      setPasswordError(message)
      return
    }

    if (!formData.newPassword) {
      const message = 'New Password is required'
      setPasswordError(message)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      const message = 'Passwords do not match'
      setPasswordError(message)
      return
    }

    const payload = {
      oldPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    }

    if (formData.newPassword.trim().length < 6) {
      const message = 'New password must be at least 6 characters.'
      setPasswordError(message)
      toast.error(message)
      return
    }

    setPasswordError('')
    setIsChangingPassword(true)

    try {
      const response = await changePassword(payload)

      toast.success(response.data?.message || 'Password changed successfully')
      handleCloseChangePasswordModal()
    } catch (err) {
      console.error('Password change failed:', err)
      const message = err.response?.data?.message || 'Error changing password'
      setPasswordError(message)
      toast.error(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  function handleOpenDeleteModal() {
    if (!isOwnProfile || !currentUser?._id) {
      return
    }

    setDeleteError('')
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    if (isDeletingAccount) {
      return
    }

    setDeleteError('')
    setIsDeleteModalOpen(false)
  }

  async function handleDeleteAccount() {
    setDeleteError('')
    setIsDeletingAccount(true)

    try {
      const response = await deleteAccount()
      toast.success(response?.message || 'Account deleted successfully')

      setUser(null)
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Delete account failed:', err)
      const message = getApiErrorMessage(err, 'Failed to delete account.')
      setDeleteError(message)
      toast.error(message)
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const tabContent = useMemo(() => {
    if (activeTab === 'tweets') return <TweetsTab tweets={tweets} />
    if (activeTab === 'playlists') return <PlaylistsTab userId={currentUser?._id} />
    if (activeTab === 'history') {
      return (
        <HistoryTab
          loading={historyLoading}
          history={history}
          isOwnProfile={isOwnProfile}
          onOpenVideo={(videoId) => navigate(`/video/${videoId}`)}
        />
      )
    }
    return <VideosTab videos={videos} />
  }, [activeTab, currentUser?._id, history, historyLoading, isOwnProfile, navigate, tweets, videos])

  if (authLoading) {
    return <ProfileSkeleton />
  }

  if (!currentUser?._id) {
    return <div className="p-6 text-white">Loading profile...</div>
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
        {error}
      </section>
    )
  }

  if (!profileUser) {
    return <div className="p-6 text-white">Loading profile...</div>
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="space-y-5"
    >
      <ProfileHeader
        profile={headerProfile}
        isOwnProfile={isOwnProfile}
        isSubscribing={subscribing}
        onEditProfile={handleEditProfile}
        onOpenAccountSettings={handleOpenAccountSettingsModal}
        onToggleSubscribe={handleToggleSubscription}
      />
      <ProfileStats
        subscribersCount={profileUser?.subscribersCount ?? 0}
        subscribedCount={profileUser?.channelsSubscribedToCount ?? 0}
        totalVideos={videos.length}
        totalTweets={tweets.length}
      />
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {tabContent}

      {isEditModalOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto p-6 dark:bg-slate-900">
            <div className="sticky top-0 bg-white z-10 pb-3 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Profile</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Avatar</label>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar preview"
                    className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Change Photo
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cover Image</label>
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />

                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="h-30 w-full rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="grid h-30 w-full place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    No cover image
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Upload Cover
                  </button>

                  {coverImage ? (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove Cover
                    </button>
                  ) : null}
                </div>
              </div>

              {editError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{editError}</p>
              ) : null}

              <div className="sticky bottom-0 bg-white pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSavingProfile}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isChangePasswordModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword || ''}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30"
                />
              </div>

              {passwordError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{passwordError}</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCloseChangePasswordModal}
                  disabled={isChangingPassword}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isChangingPassword ? 'Changing...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAccountSettingsModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Account Settings</h2>
            <p className="mt-1 text-sm text-slate-500">Manage your account security and critical account actions.</p>

            <div className="mt-5 space-y-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Security</h3>
                <button
                  type="button"
                  onClick={handleOpenChangePasswordFromSettings}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Change Password
                </button>
              </section>

              <div className="border-t border-slate-200" />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-700">Danger Zone</h3>
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-4">
                  <p className="text-sm text-rose-700">This action is permanent</p>
                  <button
                    type="button"
                    onClick={handleOpenDeleteFromSettings}
                    className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    Delete Account
                  </button>
                </div>
              </section>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleCloseAccountSettingsModal}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-rose-700">Delete Account</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Are you sure you want to delete your account? This action is permanent.
            </p>

            {deleteError ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeletingAccount}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.section>
  )
}
