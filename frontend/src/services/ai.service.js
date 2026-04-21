import { httpClient } from './http'

export async function generateCaption(text) {
  const res = await httpClient.post('/api/v1/ai/generate-caption', { text })
  return res.data
}