export const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
  errorMessage = 'Request failed',
  timeout = 3000
): Promise<T> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  const resp = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
    signal: controller.signal,
  })
    .catch((e) => {
      throw new Error(`${e.message} - check the ProPresenter IP or Port`)
    })
    .finally(() => clearTimeout(id))

  if (resp.status === 204) {
    return {} as T
  }

  const data = await resp.json().catch((e) => console.log(e))

  if (!resp.ok) {
    throw new Error(`${errorMessage} (${resp.status}): ${JSON.stringify(data)}`)
  }

  return data as T
}
