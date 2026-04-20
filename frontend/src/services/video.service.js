import { httpClient } from './http'

export async function fetchVideos(params = {}) {
  const res = await httpClient.get('/api/v1/videos', { params })

  return {
    videos: res.data?.data?.docs ?? [],
    pagination: {
      totalDocs: res.data?.data?.totalDocs ?? 0,
      totalPages: res.data?.data?.totalPages ?? 0,
      page: res.data?.data?.page ?? 1,
      hasNextPage: res.data?.data?.hasNextPage ?? false,
      hasPrevPage: res.data?.data?.hasPrevPage ?? false,
    },
    message: res.data?.message,
  }
}

export async function fetchVideoById(videoId) {
  const res = await httpClient.get(`/api/v1/videos/${videoId}`)

  return {
    video: res.data?.data ?? null,
    message: res.data?.message,
  }
}

export async function toggleVideoLike(videoId) {
  const res = await httpClient.post(`/api/v1/likes/video/${videoId}`)

  return {
    liked: res.data?.data?.liked,
    message: res.data?.message,
  }
}

export async function uploadVideo(payload) {
  const formData = new FormData()

  formData.append('videoFile', payload.videoFile)
  formData.append('thumbnail', payload.thumbnail)
  formData.append('title', payload.title)
  formData.append('description', payload.description)

  if (typeof payload.publishStatus !== 'undefined') {
    formData.append('publishStatus', String(payload.publishStatus))
  }

  const res = await httpClient.post('/api/v1/videos', formData)

  return {
    video: res.data?.data ?? null,
    message: res.data?.message,
  }
}

export async function fetchWatchHistory(params = {}) {
  const res = await httpClient.get('/api/v1/watch-history', { params })

  return {
    history: res.data?.data?.docs ?? [],
    message: res.data?.message,
  }
}

export async function addToWatchHistory(videoId) {
  const res = await httpClient.post(`/api/v1/watch-history/${videoId}`)

  return {
    data: res.data?.data ?? null,
    message: res.data?.message,
  }
}

export async function deleteVideo(videoId) {
  const res = await httpClient.delete(`/api/v1/videos/${videoId}`)

  return {
    message: res.data?.message,
  }
}

export async function toggleVideoPublish(videoId) {
  const res = await httpClient.patch(`/api/v1/videos/toggle/publish/${videoId}`)

  return {
    video: res.data?.data ?? null,
    message: res.data?.message,
  }
}