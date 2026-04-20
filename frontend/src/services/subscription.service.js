import { httpClient } from './http'

export async function fetchMySubscribedChannels(params = {}) {
  const response = await httpClient.get('/api/v1/subscriptions/channels', { params })

  return {
    channels: response.data?.data?.channels ?? [],
    message: response.data?.message,
  }
}

export async function fetchSubscriptionsVideos(params = {}) {
  const response = await httpClient.get('/api/v1/subscriptions/videos', { params })

  return {
    videos: response.data?.data?.videos ?? [],
    message: response.data?.message,
  }
}

export async function fetchSubscribedChannels(subscriberId, params = {}) {
  const response = await httpClient.get(`/api/v1/subscriptions/get-subscribed-channels/${subscriberId}`, { params })

  return {
    channels: response.data?.data?.docs ?? [],
    message: response.data?.message,
  }
}

export async function fetchChannelSubscribersCount(channelId) {
  const response = await httpClient.get(`/api/v1/subscriptions/get-subscribers/${channelId}`, {
    params: { page: 1, limit: 1 },
  })

  return {
    total: response.data?.data?.totalDocs ?? 0,
    message: response.data?.message,
  }
}
