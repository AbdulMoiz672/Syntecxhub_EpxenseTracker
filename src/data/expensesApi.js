async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api/expenses${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Could not reach the API. Start MongoDB and run npm run dev again.')
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The expense request failed.')
  return result
}

export async function fetchExpenses() {
  const result = await request('')
  return result.expenses
}

export async function createExpense(expense) {
  const result = await request('', {
    method: 'POST',
    body: JSON.stringify(expense),
  })
  return result.expense
}

export async function removeExpense(id) {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}