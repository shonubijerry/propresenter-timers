'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Timer } from './interfaces/time'
import { TimerActions } from './hooks/timer'
import HomeMain from './components/HomeMain'
import WatchMain from './components/watch/WatchMain'
import { useShared } from './providers/timer'
import { useSettings } from './providers/settings'
import { toastError, toastSuccess } from '@/lib/toastUtils'
import { useTimersApi } from './hooks/useTimerApi'

export default function Home() {
  const {
    timers,
    error,
    refetchTimers,
    deleteTimer,
    setTimerOperation,
    setAllTimersOperation,
    updateTimers,
  } = useTimersApi()
  const [searchableTimers, setSearchableTimers] = useState<Timer[]>([])
  const [showTime, setShowTime] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { currentTimer, setCurrentTimer, localTimer } = useShared()
  const {  isLoading } = useSettings()

  const operationInProgress = useRef(false)

  // Helper to set and log API errors
  const setApiError = useCallback(
    (err: unknown, fallback = 'An error occurred') => {
      const message = err instanceof Error ? err.message : fallback
      if (err && typeof err === 'object')
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

  useEffect(() => {
    setApiError(error)
  }, [error, setApiError])

  useEffect(() => {
    setSearchableTimers(timers)
  }, [timers, setSearchableTimers])

  // Load initial timers and sync running state with local timer
  useEffect(() => {
    if (!isInitialized) return

    let mounted = true

    if (!mounted) return
    // If there's a running timer from initial fetch, sync it
    const runningTimer = searchableTimers.find((d) =>
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

    if (mounted) setIsInitialized(true)

    return () => {
      mounted = false
    }
  }, [isInitialized, setCurrentTimer, localTimer, searchableTimers])

  // URL param handling (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    setShowTime(urlParams.get('showTime') === 'true')
  }, [])

  // Reset all timers (start/stop/reset for all)
  const resetAllTimers = useCallback(
    async (action: TimerActions) => {
      await runOperation(async () => {
        await setAllTimersOperation(action)
        await refetchTimers()
        setCurrentTimer(null)
        localTimer.handleLocalTimer('reset')
        localTimer.overtime.reset(undefined, false)
      }, 'Failed to reset timers')
      toastSuccess('Operation successful')
    },
    [
      runOperation,
      setCurrentTimer,
      localTimer,
      refetchTimers,
      setAllTimersOperation,
    ]
  )

  // Delete a timer
  const handleDelete = useCallback(
    async (uuid: string) => {
      await runOperation(async () => {
        await deleteTimer(uuid)
        updateTimers(timers.filter((t) => t.id.uuid !== uuid))
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
      runOperation,
      currentTimer?.id.uuid,
      setCurrentTimer,
      localTimer,
      deleteTimer,
      timers,
      updateTimers,
    ]
  )

  // Perform operation on a single timer (start/stop/reset)
  const handleOperation = useCallback(
    async (timer: Timer, action: TimerActions) => {
      await runOperation(async () => {
        if (localTimer.isRunning && action === 'start') return
        if (!localTimer.isRunning && action === 'stop') return

        localTimer.overtime.reset(undefined, false)
        await setTimerOperation(action, timer.id.uuid)

        if (action === 'reset') {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('reset', timer.countdown?.duration)
        } else {
          setCurrentTimer(timer)
          localTimer.handleLocalTimer(action, timer.remainingSeconds)
        }
      }, `Failed to ${action} timer`)
    },
    [runOperation, localTimer, setCurrentTimer, setTimerOperation]
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
    try {
      setSearchableTimers([])
      await refetchTimers()
      toastSuccess('Timers refreshed')
    } catch (err) {
      setApiError(err, 'Failed to refresh timers')
    }
  }, [setApiError, refetchTimers])

  const updateTimerInList = (timer: Timer) => {
    if (!timers.find((t) => t.id.uuid === timer.id.uuid)) {
      // append newly created timer to list
      updateTimers([...timers, timer])
      setSearchableTimers((prev) => [...prev, timer])
      return
    }

    const isActiveTimer = currentTimer && currentTimer.id.uuid === timer.id.uuid

    const updateTimersArray = (list: Timer[]) =>
      list.map((t) => (t.id.uuid === timer.id.uuid ? { ...t, ...timer } : t))

    updateTimers((timers))
    setSearchableTimers((prev) => updateTimersArray(prev))
    if (isActiveTimer) {
      setCurrentTimer((prev) => (prev ? { ...prev, ...timer } : prev))
      localTimer.handleLocalTimer('start', timer.countdown?.duration)
    } else {
      const timestamp = Date.now()
      localTimer.overtime.reset(
        new Date(timestamp + (timer.countdown?.duration ?? 0) * 1000),
        false
      )
    }
  }

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
          updateTimerInList={updateTimerInList}
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
