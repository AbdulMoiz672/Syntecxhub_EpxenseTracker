async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api/auth/${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach the API. Check that MongoDB is running and restart npm run dev.')
  }

  const result = await response.json().catch(() => ({}))
  if (response.status >= 500) {
    throw new Error('The API is unavailable. Check that MongoDB is running, then restart npm run dev.')
  }
  if (!response.ok) throw new Error(result.error || 'Authentication request failed.')
  return result
}

export async function registerAccount(details) {
  const result = await request('register', {
    method: 'POST',
    body: JSON.stringify(details),
  })
  return result.user
}

export async function loginAccount(credentials) {
  const result = await request('login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  return result.user
}

export async function getCurrentUser() {
  try {
    const result = await request('session')
    return result.user
  } catch (error) {
    if (error.message === 'Not signed in.') return null
    throw error
  }
}

export async function logoutAccount() {
  await request('logout', { method: 'POST' })
}