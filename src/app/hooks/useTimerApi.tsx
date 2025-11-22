import { useState, useEffect, useCallback } from 'react'
import { Timer } from '../interfaces/time'
import { convertTimeToSeconds } from '@/lib/formatter'
import { useSettings } from '../providers/settings'
import { fetchJson } from './client'
import { TimerActions } from './timer'

interface TimersApiHook {
  timers: Timer[]
  isLoading: boolean
  error: Error | null
  refetchTimers: () => Promise<void>
  createTimer: (duration: number, name: string) => Promise<Timer>
  editTimer: (duration: number, name: string, id?: string) => Promise<Timer>
  deleteTimer: (id?: string) => Promise<void>
  setTimerOperation: (operation: string, id?: string) => Promise<void>
  setTimerUpdateOperation: (
    duration: number,
    name: string,
    operation: string,
    id?: string
  ) => Promise<Timer>
  setAllTimersOperation: (operation: TimerActions) => Promise<void>
  updateTimers: (data: Timer[]) => void
}

/**
 * Custom React Hook to manage Timer API operations.
 * @param baseUrl The base URL for the API.
 */
export const useTimersApi = (): TimersApiHook => {
  const [timers, setTimers] = useState<Timer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const { proPresenterUrl: baseUrl } = useSettings()

  // --- Core Fetch Function (from fetchTimersApi) ---
  const fetchTimers = useCallback(async (): Promise<Timer[]> => {
    if (!baseUrl) {
      throw new Error('Base URL not set')
    }

    return await Promise.all([
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
      .then(([all, current]) => {
        const map = new Map(
          current.map((t) => [
            t.id.uuid,
            { ...t, remainingSeconds: convertTimeToSeconds(t.time) },
          ])
        )

        return all.map((t) => ({ ...t, ...map.get(t.id.uuid) }))
      })
      .catch((err) => {
        setError(err)
        return []
      })
  }, [baseUrl])

  // --- Data Fetch Effect ---
  const refetchTimers = useCallback(async () => {
    if (!baseUrl) return

    setIsLoading(true)
    setError(null)
    try {
      const fetchedTimers = await fetchTimers()
      setTimers(fetchedTimers)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl, fetchTimers])

  useEffect(() => {
    refetchTimers()
  }, [refetchTimers])

  // --- API Mutation Functions (Wrappers for original functions) ---

  const createTimer = useCallback(
    (duration: number, name: string): Promise<Timer> => {
      if (!baseUrl) throw new Error('Base URL not set')
      return fetchJson<Timer>(
        `${baseUrl}/v1/timers`,
        {
          method: 'POST',
          body: JSON.stringify({
            allows_overrun: true,
            countdown: { duration },
            name,
          }),
        },
        'Failed to create timer'
      )
    },
    [baseUrl]
  )

  const editTimer = useCallback(
    (duration: number, name: string, id?: string): Promise<Timer> => {
      if (!baseUrl) throw new Error('Base URL not set')
      if (!id) throw new Error('Id not set for update')

      return fetchJson<Timer>(
        `${baseUrl}/v1/timer/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            allows_overrun: true,
            countdown: { duration },
            id: {
              name, // Assuming this should be 'name' as per original
            },
          }),
        },
        'Failed to update timer'
      )
    },
    [baseUrl]
  )

  const deleteTimer = useCallback(
    async (id?: string): Promise<void> => {
      if (!baseUrl) throw new Error('Base URL not set')
      if (!id) throw new Error('Id not set for delete')

      await fetchJson<void>(
        `${baseUrl}/v1/timer/${id}`,
        { method: 'DELETE' },
        'Failed to delete timer'
      )
    },
    [baseUrl]
  )

  const setTimerOperation = useCallback(
    async (operation: string, id?: string): Promise<void> => {
      if (!baseUrl) throw new Error('Base URL not set')
      if (!id) throw new Error('Id not set for operation')

      await fetchJson<void>(
        `${baseUrl}/v1/timer/${id}/${operation}`,
        { method: 'GET' },
        `Failed: ${operation}`
      )
    },
    [baseUrl]
  )

  const setTimerUpdateOperation = useCallback(
    (
      duration: number,
      name: string,
      operation: string,
      id?: string
    ): Promise<Timer> => {
      if (!baseUrl) throw new Error('Base URL not set')
      if (!id) throw new Error('Id not set for operation')

      return fetchJson<Timer>(
        `${baseUrl}/v1/timer/${id}/${operation}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            allows_overrun: true,
            countdown: { duration },
            id: {
              name,
            },
          }),
        },
        `Failed to update timer and ${operation} it`
      )
    },
    [baseUrl]
  )

  const setAllTimersOperation = useCallback(
    async (operation: TimerActions): Promise<void> => {
      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timers/${operation}`,
        { method: 'GET' },
        `Failed to perform operation: ${operation}`
      )
    },
    [baseUrl]
  )

  const updateTimers = (data: Timer[]) => {
    setTimers(data)
  }

  // --- Return values ---
  return {
    timers,
    isLoading,
    error,
    refetchTimers,
    createTimer,
    editTimer,
    deleteTimer,
    setTimerOperation,
    setTimerUpdateOperation,
    setAllTimersOperation,
    updateTimers
  }
}
