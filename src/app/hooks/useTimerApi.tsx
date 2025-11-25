import { useState, useEffect, useCallback } from 'react'
import { Timer } from '../interfaces/time'
import { convertTimeToSeconds } from '@/lib/formatter'
import { useSettings } from '../providers/settings'
import { fetchJson } from './client'
import { TimerActions } from './timer'
import {
  fetchTimersFromDb,
  createTimerInDb,
  editTimerInDb,
  deleteTimerFromDb,
  setTimerOperationInDb,
  setTimerUpdateOperationInDb,
  setAllTimersOperationInDb,
} from '../../lib/localDb'

interface TimersApiHook {
  timers: Timer[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
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
  fetchTimers: () => Promise<Timer[]>
}

/**
 * Custom React Hook to manage Timer operations.
 * Supports both ProPresenter API and local SQLite database.
 * @returns TimersApiHook interface with all timer operations
 */
export const useTimersApi = (): TimersApiHook => {
  const [timers, setTimers] = useState<Timer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const { proPresenterUrl: baseUrl, settings, fluidTimers } = useSettings()

  const isLocalDb = settings?.datastore === 'localDb'

  // --- Core Fetch Function ---
  const fetchTimers = useCallback(async (): Promise<Timer[]> => {
    if (isLocalDb) {
      return await fetchTimersFromDb()
    }

    // Use ProPresenter API
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
  }, [baseUrl, isLocalDb])

  // --- Data Fetch Effect ---
  const refetch = useCallback(async () => {
    if (!isLocalDb && !baseUrl) return

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
  }, [baseUrl, isLocalDb, fetchTimers])

  useEffect(() => {
    refetch()
  }, [refetch])

  // --- API Mutation Functions ---

  const createTimer = useCallback(
    async (duration: number, name: string): Promise<Timer> => {
      if (isLocalDb) {
        return await createTimerInDb(duration, name)
      }

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
    [baseUrl, isLocalDb]
  )

  const editTimer = useCallback(
    async (duration: number, name: string, id?: string): Promise<Timer> => {
      if (!id) throw new Error('Id not set for update')

      if (fluidTimers.includes(id)) throw new Error('Timer cannot be modified')

      if (isLocalDb) {
        return await editTimerInDb(duration, name, id)
      }

      if (!baseUrl) throw new Error('Base URL not set')

      return fetchJson<Timer>(
        `${baseUrl}/v1/timer/${id}`,
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
        'Failed to update timer'
      )
    },
    [baseUrl, isLocalDb, fluidTimers]
  )

  const deleteTimer = useCallback(
    async (id?: string): Promise<void> => {
      if (!id) throw new Error('Id not set for delete')

      if (fluidTimers.includes(id)) throw new Error('Timer cannot be modified')

      if (isLocalDb) {
        await deleteTimerFromDb(id)
        return
      }

      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timer/${id}`,
        { method: 'DELETE' },
        'Failed to delete timer'
      )
    },
    [baseUrl, isLocalDb, fluidTimers]
  )

  const setTimerOperation = useCallback(
    async (operation: string, id?: string): Promise<void> => {
      if (!id) throw new Error('Id not set for operation')

      if (fluidTimers.includes(id)) throw new Error('Timer cannot be modified')

      if (isLocalDb) {
        await setTimerOperationInDb(operation, id)
        return
      }

      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timer/${id}/${operation}`,
        { method: 'GET' },
        `Failed: ${operation}`
      )
    },
    [baseUrl, isLocalDb, fluidTimers]
  )

  const setTimerUpdateOperation = useCallback(
    async (
      duration: number,
      name: string,
      operation: string,
      id?: string
    ): Promise<Timer> => {
      if (!id) throw new Error('Id not set for operation')

      if (isLocalDb) {
        return await setTimerUpdateOperationInDb(duration, name, operation, id)
      }

      if (!baseUrl) throw new Error('Base URL not set')

      return fetchJson<Timer>(
        `${baseUrl}/v1/timer/${id}/${operation}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            allows_overrun: true,
            countdown: { duration },
            id: {
              name: name.length ? name : undefined,
            },
          }),
        },
        `Failed to update timer and ${operation} it`
      )
    },
    [baseUrl, isLocalDb]
  )

  const setAllTimersOperation = useCallback(
    async (operation: TimerActions): Promise<void> => {
      if (isLocalDb) {
        await setAllTimersOperationInDb(operation)
        return
      }

      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timers/${operation}`,
        { method: 'GET' },
        `Failed to perform operation: ${operation}`
      )
    },
    [baseUrl, isLocalDb]
  )

  const updateTimers = (data: Timer[]) => {
    setTimers(data)
  }

  // --- Return values ---
  return {
    timers,
    fetchTimers,
    isLoading,
    error,
    refetch,
    createTimer,
    editTimer,
    deleteTimer,
    setTimerOperation,
    setTimerUpdateOperation,
    setAllTimersOperation,
    updateTimers,
  }
}
