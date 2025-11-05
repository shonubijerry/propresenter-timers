'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Timer } from './interfaces/time'
import { TimerActions } from './hooks/timer'
import HomeMain from './components/HomeMain'
import WatchMain from './components/WatchMain'
import { useShared } from './providers/timer'
import {
  deleteTimerApi,
  fetchTimersApi,
  setAllTimersOperationApi,
  setTimerOperationApi,
} from './hooks/proPresenterApi'
import { useSettings } from './providers/settings'
import { toastError, toastSuccess } from '@/lib/toastUtils'

export default function Home() {
  const [timers, setTimers] = useState<Timer[]>([])
  const [searchableTimers, setSearchableTimers] = useState<Timer[]>([])
  const [showTime, setShowTime] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { currentTimer, setCurrentTimer, localTimer } =
    useShared()
  const { proPresenterUrl, isLoading, settings } =
    useSettings()

  const operationInProgress = useRef(false)

  // Helper to set and log API errors
  const setApiError = useCallback(
    (err: unknown, fallback = 'An error occurred') => {
      const message = err instanceof Error ? err.message : fallback
      console.error(
        `${fallback}: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
      )
      toastError(message)
    },
    []
  )

  // Generic wrapper to prevent overlapping operations and centralize flagging
  const runOperation = useCallback(
    async (fn: () => Promise<void>, onErrorFallback?: string) => {
      if (operationInProgress.current) return false
      try {
        operationInProgress.current = true
        await fn()
        return true
      } catch (err) {
        setApiError(err, onErrorFallback ?? 'Operation failed')
        return false
      } finally {
        operationInProgress.current = false
      }
    },
    [setApiError]
  )

  // Fetch timers from API and update local state
  const fetchTimers = useCallback(async (): Promise<Timer[]> => {
    const computedProPresenterUrl =
      settings?.address && settings?.port
        ? `${settings.address}:${settings.port}`
        : null

    if (!computedProPresenterUrl) {
      toastError('ProPresenter URL not configured')
      return []
    }

    try {
      const data = await fetchTimersApi(computedProPresenterUrl)
      setTimers(data)
      setSearchableTimers(data)
      return data
    } catch (err) {
      setApiError(err, 'Failed to fetch timers')
      return []
    }
  }, [setApiError, settings])

  // Load initial timers and sync running state with local timer
  useEffect(() => {
    if (isInitialized || !proPresenterUrl) return

    let mounted = true

    fetchTimers()
      .then((fetched) => {
        if (!mounted) return
        // If there's a running timer from initial fetch, sync it
        const runningTimer = fetched.find((d) =>
          ['running', 'overrunning'].includes(d.state)
        )

        if (runningTimer) {
          setCurrentTimer(runningTimer)

          if (runningTimer.state === 'running') {
            localTimer.handleLocalTimer('start', runningTimer.remainingSeconds)
          } else if (runningTimer.state === 'overrunning') {
            const timestamp = Date.now()
            localTimer.overtime.reset(
              new Date(timestamp + (runningTimer.remainingSeconds ?? 0) * 1000),
              true
            )
          }
        }
      })
      .catch((err) => setApiError(err, 'Failed to initialize timers'))
      .finally(() => {
        if (mounted) setIsInitialized(true)
      })

    return () => {
      mounted = false
    }
  }, [
    proPresenterUrl,
    isInitialized,
    setCurrentTimer,
    localTimer,
    setApiError,
    fetchTimers,
  ])

  // URL param handling (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    setShowTime(urlParams.get('showTime') === 'true')
  }, [])

  // Reset all timers (start/stop/reset for all)
  const resetAllTimers = useCallback(
    async (action: TimerActions) => {
      if (!proPresenterUrl) {
        toastError('ProPresenter URL not configured')
        return
      }

      await runOperation(async () => {
        await setAllTimersOperationApi(proPresenterUrl, action)
        await fetchTimers()
        setCurrentTimer(null)
        localTimer.handleLocalTimer('reset')
        localTimer.overtime.reset(undefined, false)
      }, 'Failed to reset timers')
      toastSuccess('Operation successful')
    },
    [proPresenterUrl, runOperation, setCurrentTimer, localTimer, fetchTimers]
  )

  // Delete a timer
  const handleDelete = useCallback(
    async (uuid: string) => {
      if (!proPresenterUrl) {
        toastError('ProPresenter URL not configured')
        return
      }

      await runOperation(async () => {
        await deleteTimerApi(proPresenterUrl, uuid)
        setTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))
        setSearchableTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))

        if (currentTimer?.id.uuid === uuid) {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('reset')
          localTimer.overtime.reset(undefined, false)
        }
      }, 'Failed to delete timer')
      toastSuccess('Event deleted')
    },
    [
      proPresenterUrl,
      runOperation,
      currentTimer?.id.uuid,
      setCurrentTimer,
      localTimer,
    ]
  )

  // Perform operation on a single timer (start/stop/reset)
  const handleOperation = useCallback(
    async (timer: Timer, action: TimerActions) => {
      if (!proPresenterUrl) {
        toastError('ProPresenter URL not configured')
        return
      }

      await runOperation(async () => {
        if (localTimer.isRunning && action === 'start') return
        if (!localTimer.isRunning && action === 'stop') return

        localTimer.overtime.reset(undefined, false)
        await setTimerOperationApi(proPresenterUrl, action, timer.id.uuid)

        if (action === 'reset') {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('reset', timer.countdown?.duration)
        } else {
          setCurrentTimer(timer)
          localTimer.handleLocalTimer(action, timer.remainingSeconds)
        }

        await fetchTimers()
      }, `Failed to ${action} timer`)
    },
    [proPresenterUrl, runOperation, localTimer, setCurrentTimer, fetchTimers]
  )

  const onSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim()
      if (!trimmed) {
        setSearchableTimers(timers)
        return
      }
      const lowered = trimmed.toLowerCase()
      setSearchableTimers(
        timers.filter(
          (item) =>
            item.id.name.toLowerCase().includes(lowered) ||
            item.id.uuid === currentTimer?.id.uuid
        )
      )
    },
    [timers, currentTimer]
  )

  const refreshTimers = useCallback(async () => {
    if (!proPresenterUrl) {
      toastError('ProPresenter URL not configured')
      return
    }

    try {
      setSearchableTimers([])
      await fetchTimers()
      toastSuccess('Timers refreshed')
    } catch (err) {
      setApiError(err, 'Failed to refresh timers')
    }
  }, [proPresenterUrl, setApiError, fetchTimers])

  if (isLoading) {
    return (
      <main
        className='min-h-screen justify-center'
        style={{
          background: 'var(--background-gradient)',
        }}
      >
        <div className='text-xl'>Loading...</div>
      </main>
    )
  }

  return (
    <main
      className='min-h-screen'
      style={{ background: 'var(--background-gradient)' }}
    >
      {!showTime ? (
        <HomeMain
          searchableTimers={searchableTimers}
          currentTimer={currentTimer}
          localTimer={localTimer}
          handleOperation={handleOperation}
          handleDelete={handleDelete}
          resetAllTimers={resetAllTimers}
          refreshTimers={refreshTimers}
          onSearch={onSearch}
        />
      ) : (
        <WatchMain
          localTimer={localTimer}
          currentTimer={currentTimer ?? null}
        />
      )}
    </main>
  )
}
