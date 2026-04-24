'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Timer } from './interfaces/time'
import { TimerAnalyticsRangeSummary } from './interfaces/analytics'
import { TimerActions } from './hooks/timer'
import HomeMain from './components/HomeMain'
import WatchMain from './components/watch/WatchMain'
import { useShared } from './providers/timer'
import { useSettings } from './providers/settings'
import { toastError, toastSuccess } from '@/lib/toastUtils'
import { useTimersApi } from './hooks/useTimerApi'

export default function Home() {
  const { isLoading, fluidTimers } = useSettings()
  const {
    timers,
    fetchTimers,
    refetch,
    deleteTimer,
    setTimerOperation,
    setAllTimersOperation,
    updateTimers,
    setTimerUpdateOperation,
    getTimerAnalyticsByRange,
  } = useTimersApi()
  const [searchableTimers, setSearchableTimers] = useState<Timer[]>([])
  const [showTime, setShowTime] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { currentTimer, setCurrentTimer, localTimer } = useShared()

  const operationInProgress = useRef(false)

  const resetLocalTimerState = useCallback(async () => {
    setCurrentTimer(null)
    await localTimer.handleLocalTimer('reset')
    localTimer.overtime.reset(undefined, false)
  }, [setCurrentTimer, localTimer])

  // Helper to set and log API errors
  const setApiError = useCallback(
    (err: unknown, fallback = 'An error occurred') => {
      const message = err instanceof Error ? err.message : fallback
      if (err && typeof err === 'object')
        console.error(
          `${fallback}: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
        )
      else console.error('raw error', err)
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
    setSearchableTimers(timers)
  }, [timers])

  // Load initial timers and sync running state with local timer
  useEffect(() => {
    if (isInitialized || isLoading) return

    let mounted = true

    const initializeTimers = async () => {
      try {
        const fetched = await fetchTimers()
        if (!mounted) return

        const runningTimers = fetched.filter((d) =>
          ['running', 'overrunning'].includes(d.state)
        )
        const onlyFluidTimerIsRunning =
          runningTimers.length > 0 && runningTimers.every((d) => d.isFluid)

        if (onlyFluidTimerIsRunning) {
          await setAllTimersOperation('reset')
          await resetLocalTimerState()
          await refetch()
          return
        }

        // If there's a running timer from initial fetch, sync it.
        // Prefer a non-fluid running timer, but fall back to any running timer.
        const runningTimer = fetched.find(
          (d) => ['running', 'overrunning'].includes(d.state) && !d.isFluid
        )

        if (runningTimer) {
          setCurrentTimer(runningTimer)

          if (
            runningTimer.state === 'overrunning' ||
            runningTimer.remainingSeconds < 0
          ) {
            const elapsed = runningTimer.remainingSeconds * -1

            const timestamp = Date.now()
            localTimer.overtime.reset(
              new Date(timestamp + elapsed * 1000),
              true
            )
          } else if (runningTimer.state === 'running') {
            localTimer.handleLocalTimer('start', runningTimer.remainingSeconds)
          }
        }
      } catch (err) {
        setApiError(err, 'Failed to initialize timers')
      } finally {
        if (mounted) setIsInitialized(true)
      }
    }

    initializeTimers()

    return () => {
      mounted = false
    }
  }, [
    isInitialized,
    isLoading,
    setCurrentTimer,
    localTimer,
    setApiError,
    fetchTimers,
    setAllTimersOperation,
    resetLocalTimerState,
    refetch,
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
      const success = await runOperation(async () => {
        await setAllTimersOperation(action)
        await refetch()
        await resetLocalTimerState()
      }, 'Failed to reset timers')

      if (success) {
        toastSuccess('Operation successful')
      }
    },
    [runOperation, refetch, resetLocalTimerState, setAllTimersOperation]
  )

  // Delete a timer
  const handleDelete = useCallback(
    async (uuid: string) => {
      const success = await runOperation(async () => {
        await deleteTimer(uuid)
        const filteredTimers = timers.filter((t) => t.id.uuid !== uuid)
        updateTimers(filteredTimers)
        setSearchableTimers(filteredTimers)

        if (currentTimer?.id.uuid === uuid) {
          await resetLocalTimerState()
        }
      }, 'Failed to delete timer')

      if (success) {
        toastSuccess('Event deleted')
      }
    },
    [
      runOperation,
      currentTimer?.id.uuid,
      resetLocalTimerState,
      deleteTimer,
      timers,
      updateTimers,
    ]
  )

  const updateTimerInList = useCallback(
    (timer: Timer) => {
      const existingTimer = timers.find((t) => t.id.uuid === timer.id.uuid)

      if (!existingTimer) {
        // Append newly created timer to list
        const newTimers = [...timers, timer]
        updateTimers(newTimers)
        setSearchableTimers((prev) => [...prev, timer])
        return
      }

      const isActiveTimer = currentTimer?.id.uuid === timer.id.uuid

      const updateTimersArray = (list: Timer[]) =>
        list.map((t) => (t.id.uuid === timer.id.uuid ? { ...t, ...timer } : t))

      updateTimers(updateTimersArray(timers))
      setSearchableTimers((prev) => updateTimersArray(prev))

      if (isActiveTimer) {
        setCurrentTimer((prev) => (prev ? { ...prev, ...timer } : prev))

        // Update local timer based on timer state
        if (timer.state === 'running' && timer.remainingSeconds !== undefined) {
          localTimer.handleLocalTimer('start', timer.remainingSeconds)
        } else if (
          timer.state === 'overrunning' &&
          timer.remainingSeconds !== undefined
        ) {
          const timestamp = Date.now()
          localTimer.overtime.reset(
            new Date(timestamp + timer.remainingSeconds * 1000),
            true
          )
        }
      }
    },
    [timers, currentTimer, updateTimers, setCurrentTimer, localTimer]
  )

  const applyFluidTimersOperation = useCallback(
    async (timer: Timer, action: TimerActions) => {
      if (!fluidTimers.length || !timer.countdown) return

      await Promise.all(
        timers
          .filter((t) => fluidTimers.includes(t.id.uuid))
          .map(async (fluidTimer) => {
            if (!fluidTimer) return Promise.resolve()

            const updatedFluidTimer = {
              ...fluidTimer,
              countdown: timer.countdown,
              remainingSeconds: timer.remainingSeconds,
              time: timer.time,
            }

            await setTimerUpdateOperation(
              updatedFluidTimer.countdown!.duration,
              '',
              action,
              updatedFluidTimer.id.uuid
            )
            updateTimerInList(updatedFluidTimer)
          })
      )
    },
    [fluidTimers, setTimerUpdateOperation, timers, updateTimerInList]
  )

  // Perform operation on a single timer (start/stop/reset)
  const handleOperation = useCallback(
    async (timer: Timer, action: TimerActions) => {
      await runOperation(async () => {
        const isSwitchingRunningTimer =
          action === 'start' &&
          !!currentTimer?.id.uuid &&
          currentTimer.id.uuid !== timer.id.uuid &&
          (localTimer.isRunning || localTimer.overtime.isRunning)

        if (action === 'stop' && currentTimer?.id.uuid !== timer.id.uuid) return

        if (isSwitchingRunningTimer) {
          await setAllTimersOperation('reset')
          await resetLocalTimerState()
        }

        await setTimerOperation(action, timer.id.uuid, {
          name: timer.id.name,
          duration: timer.countdown?.duration ?? 0,
        })
        await applyFluidTimersOperation(timer, action)

        await refetch()

        if (action === 'reset') {
          if (currentTimer?.id.uuid === timer.id.uuid) {
            await resetLocalTimerState()
          }
          return
        }

        if (action === 'start') {
          setCurrentTimer(timer)
          localTimer.overtime.reset(undefined, false)
          await localTimer.handleLocalTimer('start', timer.remainingSeconds)
          return
        }

        localTimer.overtime.reset(undefined, false)
        await localTimer.handleLocalTimer('stop')
      }, `Failed to ${action} timer`)
    },
    [
      runOperation,
      localTimer,
      currentTimer,
      setCurrentTimer,
      setAllTimersOperation,
      setTimerOperation,
      applyFluidTimersOperation,
      refetch,
      resetLocalTimerState,
    ]
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
      await refetch()
      toastSuccess('Timers refreshed')
    } catch (err) {
      setApiError(err, 'Failed to refresh timers')
    }
  }, [setApiError, refetch])

  const onLoadAnalyticsRange = useCallback(
    async (
      fromDate: string,
      toDate: string
    ): Promise<TimerAnalyticsRangeSummary> => {
      return await getTimerAnalyticsByRange(fromDate, toDate)
    },
    [getTimerAnalyticsByRange]
  )

  if (isLoading) {
    return (
      <main
        className='min-h-screen flex items-center justify-center'
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
          onLoadAnalytics={onLoadAnalyticsRange}
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
