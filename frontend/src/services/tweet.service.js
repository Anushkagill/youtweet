import { httpClient } from './http'

export async function fetchAllTweets(params = {}) {
  const response = await httpClient.get('/tweets/allTweets', {
    params,
  })

  return {
    tweets: response.data?.data?.tweets ?? [],
    message: response.data?.message,
  }
}

export async function createTweet(payload) {
  const response = await httpClient.post('/tweets', payload)

  return {
    tweet: response.data?.data ?? null,
    message: response.data?.message,
  }
}

export async function toggleTweetLike(tweetId) {
  const response = await httpClient.post(`/likes/tweet/${tweetId}`)

  return {
    liked: response.data?.data?.liked,
    message: response.data?.message,
  }
}

export async function deleteTweet(tweetId) {
  const response = await httpClient.delete(`/tweets/${tweetId}`)

  return {
    message: response.data?.message,
  }
}
