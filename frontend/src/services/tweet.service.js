import { httpClient } from './http'

export async function fetchAllTweets(params = {}) {
  const response = await httpClient.get('/api/v1/tweets/allTweets', {
    params,
  })

  return {
    tweets: response.data?.data?.tweets ?? [],
    message: response.data?.message,
  }
}

export async function createTweet(payload) {
  const response = await httpClient.post('/api/v1/tweets', payload)

  return {
    tweet: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function toggleTweetLike(tweetId) {
  const response = await httpClient.post(`/api/v1/likes/tweet/${tweetId}`)

  return {
    liked: response.data?.data?.liked,
    message: response.data?.message,
  }
}

export async function deleteTweet(tweetId) {
  const response = await httpClient.delete(`/api/v1/tweets/${tweetId}`)

  return {
    message: response.data?.message,
  }
}