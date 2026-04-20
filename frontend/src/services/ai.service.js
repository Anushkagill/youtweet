import { httpClient } from './http'

export async function generateCaption(text) {
  const res = await httpClient.post('/ai/generate-caption', { text })

  return res.data   // { success, title, description }
}