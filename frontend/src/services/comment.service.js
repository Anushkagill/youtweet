import { httpClient } from './http'

export async function fetchVideoComments(videoId, params = {}) {
  const res = await httpClient.get(`/comments/video/${videoId}`, { params })
  return {
    comments: res.data?.data?.docs ?? [],
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

export async function createVideoComment(videoId, content) {
  const res = await httpClient.post(`/comments/video/${videoId}`, { content })
  return {
    comment: res.data?.data ?? null,
    message: res.data?.message,
  }
}

export async function fetchTweetReplies(tweetId, params = {}) {
  const res = await httpClient.get(`/comments/tweet/${tweetId}`, { params })

  return Array.isArray(res.data?.data) ? res.data.data : []
}

export async function createTweetReply(tweetId, content) {
  const res = await httpClient.post(`/comments/tweet/${tweetId}`, { content })

  return res.data?.data ?? null
}

export async function toggleCommentLike(commentId) {
  const res = await httpClient.post(`/likes/comment/${commentId}`)

  return {
    liked: res.data?.data?.liked,
    message: res.data?.message,
  }
}

export async function deleteComment(commentId) {
  const res = await httpClient.delete(`/comments/${commentId}`)

  return {
    message: res.data?.message,
  }
}
