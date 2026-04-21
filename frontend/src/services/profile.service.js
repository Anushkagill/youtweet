import { httpClient } from './http'

export async function fetchProfileByUsername(username) {
  const response = await httpClient.get(`/api/v1/users/c/${username}`)

  return {
    user: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function fetchProfileVideos(userId, params = {}) {
  const response = await httpClient.get('/api/v1/videos', {
    params: { userId, ...params },
  })

  return {
    videos: response.data?.data?.docs ?? [],
    message: response.data?.message,
  }
}

export async function fetchProfileTweets(userId, params = {}) {
  const response = await httpClient.get('/api/v1/tweets/allTweets', {
    params: { userId, ...params },
  })

  return {
    tweets: response.data?.data?.tweets ?? [],
    message: response.data?.message,
  }
}

export async function fetchProfilePlaylists(params = {}) {
  const response = await httpClient.get('/api/v1/playlists/get-user-playlists', { params })

  return {
    playlists: response.data?.data?.playlists ?? [],
    message: response.data?.message,
  }
}

export async function fetchPlaylistById(playlistId) {
  const response = await httpClient.get(`/api/v1/playlists/${playlistId}`)

  return {
    playlist: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function createUserPlaylist(payload) {
  const response = await httpClient.post('/api/v1/playlists/create-playlist', payload)

  return {
    playlist: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function addVideoToPlaylist(playlistId, videoId) {
  const response = await httpClient.post(`/api/v1/playlists/add-video/${playlistId}/${videoId}`)

  return {
    playlist: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function removeVideoFromPlaylist(playlistId, videoId) {
  const response = await httpClient.patch(`/api/v1/playlists/remove-video/${playlistId}/${videoId}`)

  return {
    playlist: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function deletePlaylist(playlistId) {
  const response = await httpClient.delete(`/api/v1/playlists/${playlistId}`)
console.log("Deleting playlistId:", playlistId)
  return {
    message: response.data?.message,
  }
  
}

export async function togglePlaylistPublicStatus(playlistId) {
  const response = await httpClient.patch(`/api/v1/playlists/toggle-public-status/${playlistId}`)

  return {
    playlist: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function toggleProfileSubscription(channelId) {
  const response = await httpClient.post(`/api/v1/subscriptions/toggle/${channelId}`)

  const data = response.data?.data ?? {}
  const isSubscribed =
    typeof data.isSubscribed === 'boolean'
      ? data.isSubscribed
      : typeof data.subscribed === 'boolean'
        ? data.subscribed
        : false

  const subscribersCount =
    typeof data.subscribersCount === 'number' ? data.subscribersCount : 0

  return {
    isSubscribed,
    subscribed: isSubscribed,
    subscribersCount,
    message: response.data?.message,
  }
}

export async function fetchChannelSubscribersCount(channelId) {
  const response = await httpClient.get(`/api/v1/subscriptions/get-subscribers/${channelId}`, {
    params: { page: 1, limit: 1 },
  })

  return {
    subscribersCount: response.data?.data?.totalDocs ?? 0,
    message: response.data?.message,
  }
}

export async function updateProfile(data) {
  const payload = data instanceof FormData ? data : new FormData()

  if (!(data instanceof FormData)) {
    payload.append('fullName', data.fullName || '')
    payload.append('username', data.username || '')

    if (data.avatar instanceof File) {
      payload.append('avatar', data.avatar)
    }
  }

  const response = await httpClient.patch('/api/v1/users/update-profile', payload)
  return response
}

export async function changePassword(payload) {
  const response = await httpClient.patch('/api/v1/users/change-password', payload)
  return response
}

export async function deleteAccount() {
  const res = await httpClient.delete('/api/v1/users/delete-account')
  return res.data
}
