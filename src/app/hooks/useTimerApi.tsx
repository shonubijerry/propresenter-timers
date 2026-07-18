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
  getFluidTimerIds,
  fetchTimerOrdersFromDb,
  upsertTimerOrdersInDb,
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
  saveTimerOrder: (orderedTimers: Timer[]) => Promise<void>
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
    activeProfileId,
  } = useSettings()
  const [timers, setTimers] = useState<Timer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const isLocalDb = settings?.datastore === 'localDb'

  const timerOrderStorageKey = `agc:timer-order:${activeProfileId}`

  const persistTimerOrderByIds = useCallback(
    async (orderedTimerIds: string[]): Promise<void> => {
      if (db) {
        await upsertTimerOrdersInDb(orderedTimerIds, db)
        return
      }

      if (typeof window === 'undefined') return

      window.localStorage.setItem(
        timerOrderStorageKey,
        JSON.stringify(orderedTimerIds)
      )
    },
    [db, timerOrderStorageKey]
  )

  const getPersistedTimerOrderIds = useCallback(async (): Promise<string[]> => {
    if (db) {
      const orderMap = await fetchTimerOrdersFromDb(db)

      return Object.entries(orderMap)
        .sort((a, b) => a[1] - b[1])
        .map(([timerId]) => timerId)
    }

    if (typeof window === 'undefined') return []

    const stored = window.localStorage.getItem(timerOrderStorageKey)
    if (!stored) return []

    try {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    } catch {
      return []
    }
  }, [db, timerOrderStorageKey])

  const applyPersistedTimerOrder = useCallback(
    async (rawTimers: Timer[]): Promise<Timer[]> => {
      const persistedOrderIds = await getPersistedTimerOrderIds()
      const persistedOrderIndex = new Map(
        persistedOrderIds.map((timerId, index) => [timerId, index])
      )

      const sortedTimers = [...rawTimers].sort((a, b) => {
        const aOrder = persistedOrderIndex.get(a.id.uuid)
        const bOrder = persistedOrderIndex.get(b.id.uuid)

        if (aOrder === undefined && bOrder === undefined) {
          return a.id.index - b.id.index
        }

        if (aOrder === undefined) return 1
        if (bOrder === undefined) return -1

        return aOrder - bOrder
      })

      const normalizedIds = sortedTimers.map((timer) => timer.id.uuid)
      const isDifferentOrder =
        persistedOrderIds.length !== normalizedIds.length ||
        normalizedIds.some((id, index) => persistedOrderIds[index] !== id)

      if (isDifferentOrder) {
        await persistTimerOrderByIds(normalizedIds)
      }

      return sortedTimers
    },
    [getPersistedTimerOrderIds, persistTimerOrderByIds]
  )

  // --- Core Fetch Function ---
  const fetchTimers = useCallback(async (): Promise<Timer[]> => {
    try {
      if (isLocalDb) {
        if (!db) {
          throw new Error('Database not initialized')
        }
        const localTimers = await fetchTimersFromDb(db)
        return await applyPersistedTimerOrder(localTimers)
      }

      // Use ProPresenter API
      if (!baseUrl) {
        return []
      }

      const [all, current] = await Promise.all([
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

      const map = new Map(
        current.map((t) => [
          t.id.uuid,
          { ...t, remainingSeconds: convertTimeToSeconds(t.time) },
        ])
      )

      // Query fluid timers from local database if available
      let fluidTimerIds: string[] = []
      if (db) {
        try {
          fluidTimerIds = await getFluidTimerIds(db)
        } catch (err) {
          console.warn('Failed to load fluid timers from database:', err)
        }
      }

      const timersWithMetadata = all.map((t) => ({
        ...t,
        ...map.get(t.id.uuid),
        isFluid: fluidTimerIds.includes(t.id.uuid),
      }))

      return await applyPersistedTimerOrder(timersWithMetadata)
    } catch (err) {
      setError(err as Error)
      return []
    }
  }, [baseUrl, isLocalDb, db, applyPersistedTimerOrder])

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

  const saveTimerOrder = useCallback(
    async (orderedTimers: Timer[]): Promise<void> => {
      await persistTimerOrderByIds(orderedTimers.map((timer) => timer.id.uuid))
      setTimers(orderedTimers)
    },
    [persistTimerOrderByIds]
  )

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
    saveTimerOrder,
    getTimerAnalyticsByDate,
    getTimerAnalyticsByRange,
  }
}
