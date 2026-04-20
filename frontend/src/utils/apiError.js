export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  const response = error?.response
  const data = response?.data

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const firstError = data.errors[0]
    if (typeof firstError === 'string') {
      return firstError
    }
    if (firstError?.message) {
      return firstError.message
    }
  }

  if (typeof data?.message === 'string') {
    return data.message
  }

  if (typeof error?.message === 'string') {
    return error.message
  }

  return fallback
}
