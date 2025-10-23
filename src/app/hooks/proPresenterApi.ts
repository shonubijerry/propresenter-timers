import { convertTimeToSeconds } from '@/lib/formatter'
import { Timer } from '../interfaces/time'
import { TimerActions } from './timer'

const fetchJson = async <T>(
  url: string,
  options?: RequestInit,
  errorMessage = 'Request failed',
  timeout = 3000
): Promise<T> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  const resp = await fetch(url, {
    cache: 'no-store',
    headers: { accept: 'application/json', ...options?.headers },
    ...options,
    signal: controller.signal,
  })
    .catch((e) => {
      throw new Error(`${e.message} - check the ProPresenter IP or Port`)
    })
    .finally(() => clearTimeout(id))

  const data = await resp.json().catch((e) => console.log(e))

  if (!resp.ok) {
    throw new Error(`${errorMessage}: ${JSON.stringify(data)}`)
  }

  return data as T
}

// --- Timers ---
export const fetchTimersApi = async (baseUrl: string): Promise<Timer[]> => {
  const [allTimers, currentTimers] = await Promise.all([
    fetchJson<Timer[]>(
      `${baseUrl}/v1/timers?chunked=false`,
      undefined,
      'Failed to fetch timers'
    ),
    fetchJson<Timer[]>(
      `${baseUrl}/v1/timers/current?chunked=false`,
      undefined,
      'Failed to fetch current timers'
    ),
  ])

  const currentMap = new Map<string, Timer>()
  currentTimers.forEach((timer) => {
    timer.remainingSeconds = convertTimeToSeconds(timer.time)
    currentMap.set(timer.id.uuid, timer)
  })

  return allTimers.map((t) => ({ ...t, ...currentMap.get(t.id.uuid) }))
}

export const createTimerApi = (
  baseUrl: string | null,
  duration: number,
  name: string
): Promise<Timer> =>
  fetchJson<Timer>(
    `${baseUrl}/v1/timers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allows_overrun: true,
        countdown: { duration: duration * 60 },
        name,
      }),
    },
    'Failed to create timer'
  )

export const editTimerApi = (
  baseUrl: string | null,
  duration: number,
  name: string,
  id?: string
): Promise<Timer> => {
  if (!id) throw new Error('Id not set for update')

  return fetchJson<Timer>(
    `${baseUrl}/v1/timer/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allows_overrun: true,
        countdown: { duration: duration * 60 },
        id: {
          name,
        },
      }),
    },
    'Failed to update timer'
  )
}

export const deleteTimerApi = async (
  baseUrl: string | null,
  id?: string
): Promise<void> => {
  if (!id) throw new Error('Id not set for delete')

  await fetchJson<void>(
    `${baseUrl}/v1/timer/${id}`,
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
    'Failed to delete timer'
  )
}

export const setTimerOperationApi = async (
  baseUrl: string | null,
  operation: string,
  id?: string
): Promise<void> => {
  if (!id) throw new Error('Id not set for operation')

  await fetchJson<void>(
    `${baseUrl}/v1/timer/${id}/${operation}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    `Failed to perform operation: ${operation}`
  )
}

export const setAllTimersOperationApi = async (
  baseUrl: string | null,
  operation: TimerActions
): Promise<void> => {
  await fetchJson<void>(
    `${baseUrl}/v1/timers/${operation}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    `Failed to perform operation: ${operation}`
  )
}
