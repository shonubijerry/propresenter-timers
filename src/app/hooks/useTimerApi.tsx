import { useState, useEffect, useCallback } from 'react'
import { Timer } from '../interfaces/time'
import {
  TimerAnalyticsRangeSummary,
  TimerAnalyticsSummary,
} from '../interfaces/analytics'
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
  getTimerAnalyticsByDateFromDb,
  getTimerAnalyticsByRangeFromDb,
} from '../../lib/localDb'
import {
  getTimerAnalyticsByRange as getTimerAnalyticsByRangeShared,
  getTimerAnalyticsByDate as getTimerAnalyticsByDateShared,
  recordTimerRunEnd,
  recordTimerRunStart,
} from '@/lib/timerAnalyticsDb'

type TimerAnalyticsMeta = {
  name: string
  duration: number
}

interface TimersApiHook {
  timers: Timer[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createTimer: (duration: number, name: string) => Promise<Timer>
  editTimer: (duration: number, name: string, id?: string) => Promise<Timer>
  deleteTimer: (id?: string) => Promise<void>
  setTimerOperation: (
    operation: string,
    id?: string,
    analyticsMeta?: TimerAnalyticsMeta
  ) => Promise<void>
  setTimerUpdateOperation: (
    duration: number,
    name: string,
    operation: string,
    id?: string
  ) => Promise<Timer>
  setAllTimersOperation: (operation: TimerActions) => Promise<void>
  updateTimers: (data: Timer[]) => void
  fetchTimers: () => Promise<Timer[]>
  getTimerAnalyticsByDate: (date: string) => Promise<TimerAnalyticsSummary>
  getTimerAnalyticsByRange: (
    fromDate: string,
    toDate: string
  ) => Promise<TimerAnalyticsRangeSummary>
}

/**
 * Custom React Hook to manage Timer operations.
 * Supports both ProPresenter API and local SQLite database.
 * @returns TimersApiHook interface with all timer operations
 */
export const useTimersApi = (): TimersApiHook => {
  const {
    proPresenterUrl: baseUrl,
    settings,
    fluidTimers = [],
    db,
  } = useSettings()
  const [timers, setTimers] = useState<Timer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const isLocalDb = settings?.datastore === 'localDb'

  // --- Core Fetch Function ---
  const fetchTimers = useCallback(async (): Promise<Timer[]> => {
    if (isLocalDb) {
      if (!db) {
        throw new Error('Database not initialized')
      }
      return await fetchTimersFromDb(db)
    }

    // Use ProPresenter API
    if (!baseUrl) {
      return []
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
      .then(async ([all, current]) => {
        const map = new Map(
          current.map((t) => [
            t.id.uuid,
            { ...t, remainingSeconds: convertTimeToSeconds(t.time) },
          ])
        )

        return all.map((t) => ({
          ...t,
          ...map.get(t.id.uuid),
          isFluid: fluidTimers.includes(t.id.uuid),
        }))
      })
      .catch((err) => {
        setError(err)
        return []
      })
  }, [baseUrl, isLocalDb, db, fluidTimers])

  // --- Data Fetch Effect ---
  const refetch = useCallback(async () => {
    if (isLocalDb && !db) return
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
  }, [baseUrl, isLocalDb, fetchTimers, db])

  useEffect(() => {
    refetch()
  }, [refetch])

  // --- API Mutation Functions ---

  const createTimer = useCallback(
    async (duration: number, name: string): Promise<Timer> => {
      if (isLocalDb) {
        if (!db) throw new Error('Database not initialized')
        return await createTimerInDb(duration, name, db)
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
    [baseUrl, isLocalDb, db]
  )

  const editTimer = useCallback(
    async (duration: number, name: string, id?: string): Promise<Timer> => {
      if (!id) throw new Error('Id not set for update')

      if (fluidTimers.includes(id)) throw new Error('Timer cannot be modified')

      if (isLocalDb) {
        if (!db) throw new Error('Database not initialized')
        return await editTimerInDb(
          {
            countdown_duration: duration,
            name,
            uuid: id,
          },
          db
        )
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
    [baseUrl, isLocalDb, fluidTimers, db]
  )

  const deleteTimer = useCallback(
    async (id?: string): Promise<void> => {
      if (!id) throw new Error('Id not set for delete')

      if (fluidTimers.includes(id)) throw new Error('Timer cannot be modified')

      if (isLocalDb) {
        if (!db) throw new Error('Database not initialized')
        await deleteTimerFromDb(id, db)
        return
      }

      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timer/${id}`,
        { method: 'DELETE' },
        'Failed to delete timer'
      )
    },
    [baseUrl, isLocalDb, fluidTimers, db]
  )

  const setTimerOperation = useCallback(
    async (
      operation: string,
      id?: string,
      analyticsMeta?: TimerAnalyticsMeta
    ): Promise<void> => {
      if (!id) throw new Error('Id not set for operation')

      if (fluidTimers.includes(id)) throw new Error('Timer cannot be modified')

      if (isLocalDb) {
        if (!db) throw new Error('Database not initialized')
        await setTimerOperationInDb(operation, id, db)
        return
      }

      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timer/${id}/${operation}`,
        { method: 'GET' },
        `Failed: ${operation}`
      )

      if (!db) return
      if (fluidTimers.includes(id)) return

      if (operation === 'start' && analyticsMeta) {
        await recordTimerRunStart(
          {
            timerUuid: id,
            timerName: analyticsMeta.name,
            scheduledDuration: analyticsMeta.duration,
          },
          db
        )
      }

      if (operation === 'stop' || operation === 'reset') {
        await recordTimerRunEnd(id, operation, db)
      }
    },
    [baseUrl, isLocalDb, fluidTimers, db]
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
        if (!db) throw new Error('Database not initialized')
        return await setTimerUpdateOperationInDb(
          duration,
          name,
          operation,
          id,
          db
        )
      }

      if (!baseUrl) throw new Error('Base URL not set')

      if (name.length) {
        await fetchJson<Timer>(
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
          `Failed to update timer`
        )
      }

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
        `Failed to update timer operation`
      ).then(async (response) => {
        if (db && !fluidTimers.includes(id)) {
          if (operation === 'start') {
            await recordTimerRunStart(
              {
                timerUuid: id,
                timerName: name.length ? name : response.id.name,
                scheduledDuration: duration,
              },
              db
            )
          }

          if (operation === 'stop' || operation === 'reset') {
            await recordTimerRunEnd(id, operation, db)
          }
        }

        return response
      })
    },
    [baseUrl, isLocalDb, db, fluidTimers]
  )

  const setAllTimersOperation = useCallback(
    async (operation: TimerActions): Promise<void> => {
      if (isLocalDb) {
        if (!db) throw new Error('Database not initialized')
        await setAllTimersOperationInDb(operation, db)
        return
      }

      if (!baseUrl) throw new Error('Base URL not set')

      await fetchJson<void>(
        `${baseUrl}/v1/timers/${operation}`,
        { method: 'GET' },
        `Failed to perform operation: ${operation}`
      )

      if (!db) return

      if (operation === 'reset' || operation === 'stop') {
        const nonFluidTimerIds = timers
          .filter((timer) => !timer.isFluid)
          .map((timer) => timer.id.uuid)

        await Promise.all(
          nonFluidTimerIds.map((timerId) =>
            recordTimerRunEnd(timerId, operation, db)
          )
        )
        return
      }

      if (operation === 'start') {
        await Promise.all(
          timers
            .filter((timer) => !timer.isFluid && timer.countdown)
            .map((timer) =>
              recordTimerRunStart(
                {
                  timerUuid: timer.id.uuid,
                  timerName: timer.id.name,
                  scheduledDuration: timer.countdown!.duration,
                },
                db
              )
            )
        )
      }
    },
    [baseUrl, isLocalDb, db, timers]
  )

  const updateTimers = useCallback((data: Timer[]) => {
    setTimers(data)
  }, [])

  const getTimerAnalyticsByDate = useCallback(
    async (date: string): Promise<TimerAnalyticsSummary> => {
      if (!db) {
        throw new Error('Analytics is available only in desktop app mode')
      }

      if (isLocalDb) {
        return await getTimerAnalyticsByDateFromDb(date, db)
      }

      return await getTimerAnalyticsByDateShared(date, db)
    },
    [isLocalDb, db]
  )

  const getTimerAnalyticsByRange = useCallback(
    async (
      fromDate: string,
      toDate: string
    ): Promise<TimerAnalyticsRangeSummary> => {
      if (!db) {
        throw new Error('Analytics is available only in desktop app mode')
      }

      if (isLocalDb) {
        return await getTimerAnalyticsByRangeFromDb(fromDate, toDate, db)
      }

      return await getTimerAnalyticsByRangeShared(fromDate, toDate, db)
    },
    [isLocalDb, db]
  )

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
    getTimerAnalyticsByDate,
    getTimerAnalyticsByRange,
  }
}
