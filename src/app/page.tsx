'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Timer, TimerEditInput } from './interfaces/time'
import { TimerAnalyticsRangeSummary } from './interfaces/analytics'
import { TimerActions } from './hooks/timer'
import HomeMain from './components/HomeMain'
import WatchMain from './components/watch/WatchMain'
import { useShared } from './providers/timer'
import { useSettings } from './providers/settings'
import { toastError, toastSuccess } from '@/lib/toastUtils'
import { useTimersApi } from './hooks/useTimerApi'
import {
  LIVE_TIMER_STORAGE_KEY,
  LiveTimerSnapshot,
  parseLiveTimerSnapshot,
  planTimerEdit,
} from '@/lib/timerLogic'
import { formatSecondsToTime } from '@/lib/formatter'
import { logTiming } from '@/lib/perfLog'

// Screen windows open with ?showTime=true. Home only mounts in the browser
// (settings load first), so reading the URL here is safe.
const isScreenWindow = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('showTime') === 'true'

const readLiveSnapshot = (): LiveTimerSnapshot | null => {
  try {
    return parseLiveTimerSnapshot(
      window.localStorage.getItem(LIVE_TIMER_STORAGE_KEY)
    )
  } catch {
    return null
  }
}

const snapshotToTimer = (
  timer: NonNullable<LiveTimerSnapshot['timer']>
): Timer => ({
  id: { uuid: timer.uuid, name: timer.name, index: 0 },
  countdown: { duration: timer.duration },
  allows_overrun: true,
  state: 'running',
  time: '',
  remainingSeconds: timer.duration,
})

export default function Home() {
  const { isLoading, fluidTimers } = useSettings()
  const [showTime] = useState(isScreenWindow)
  // A screen window follows the main window when it has published its state
  const [followsMainWindow] = useState(
    () => isScreenWindow() && readLiveSnapshot() !== null
  )
  const {
    timers,
    fetchTimers,
    refetch,
    createTimer,
    editTimer,
    deleteTimer,
    setTimerOperation,
    setAllTimersOperation,
    updateTimers,
    saveTimerOrder,
    setTimerUpdateOperation,
    getTimerAnalyticsByRange,
  } = useTimersApi({ autoFetch: !showTime })
  const [searchableTimers, setSearchableTimers] = useState<Timer[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  const { currentTimer, setCurrentTimer, localTimer } = useShared()

  const operationInProgress = useRef(false)

  // The countdown changes every second. Callbacks read it through a ref so
  // they stay stable and the timer cards don't all re-render on each tick.
  const localTimerRef = useRef(localTimer)
  localTimerRef.current = localTimer

  const resetLocalTimerState = useCallback(async () => {
    setCurrentTimer(null)
    await localTimerRef.current.handleLocalTimer('reset')
    localTimerRef.current.clearOvertime()
  }, [setCurrentTimer])

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

    // Screen windows get their state from the main window instead
    if (followsMainWindow) {
      setIsInitialized(true)
      return
    }

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
            localTimerRef.current.startOvertime(
              runningTimer.remainingSeconds * -1
            )
          } else if (runningTimer.state === 'running') {
            localTimerRef.current.handleLocalTimer(
              'start',
              runningTimer.remainingSeconds
            )
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
    followsMainWindow,
    setCurrentTimer,
    setApiError,
    fetchTimers,
    setAllTimersOperation,
    resetLocalTimerState,
    refetch,
  ])

  // Main window: publish the live timer so open screen windows follow it
  const liveTimer = currentTimer
    ? {
        uuid: currentTimer.id.uuid,
        name: currentTimer.id.name,
        duration: currentTimer.countdown?.duration ?? 0,
      }
    : null
  const liveTimerKey = JSON.stringify(liveTimer)
  const anchor = localTimer.anchor

  useEffect(() => {
    if (showTime || !isInitialized) return

    const snapshot: LiveTimerSnapshot = {
      timer: JSON.parse(liveTimerKey),
      anchor,
      sentAt: Date.now(),
    }

    try {
      window.localStorage.setItem(
        LIVE_TIMER_STORAGE_KEY,
        JSON.stringify(snapshot)
      )
    } catch (err) {
      console.warn('Failed to publish live timer:', err)
    }
  }, [showTime, isInitialized, liveTimerKey, anchor])

  // Screen window: follow the main window's live timer
  useEffect(() => {
    if (!showTime) return

    const apply = (snapshot: LiveTimerSnapshot | null) => {
      if (!snapshot) return
      setCurrentTimer(snapshot.timer ? snapshotToTimer(snapshot.timer) : null)
      localTimerRef.current.applyAnchor(snapshot.anchor)
    }

    apply(readLiveSnapshot())
    logTiming('Screen window ready')

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LIVE_TIMER_STORAGE_KEY) return
      apply(parseLiveTimerSnapshot(event.newValue))
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [showTime, setCurrentTimer])

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
        await saveTimerOrder(filteredTimers)
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
      saveTimerOrder,
    ]
  )

  const updateTimerInList = useCallback(
    (timer: Timer) => {
      const existingTimer = timers.find((t) => t.id.uuid === timer.id.uuid)

      if (!existingTimer) {
        // Append newly created timer to list
        const newTimers = [...timers, timer]
        void saveTimerOrder(newTimers)
        setSearchableTimers((prev) => [...prev, timer])
        return
      }

      // Functional updates so several calls in a row don't overwrite each other
      const updateTimersArray = (list: Timer[]) =>
        list.map((t) => (t.id.uuid === timer.id.uuid ? { ...t, ...timer } : t))

      updateTimers(updateTimersArray)
      setSearchableTimers(updateTimersArray)

      if (currentTimer?.id.uuid === timer.id.uuid) {
        setCurrentTimer((prev) => (prev ? { ...prev, ...timer } : prev))
      }
    },
    [timers, currentTimer, updateTimers, setCurrentTimer, saveTimerOrder]
  )

  const handleReorderTimer = useCallback(
    async (timerId: string, direction: 'up' | 'down') => {
      const visibleIndex = searchableTimers.findIndex(
        (timer) => timer.id.uuid === timerId
      )

      if (visibleIndex < 0) return

      const swapVisibleIndex =
        direction === 'up' ? visibleIndex - 1 : visibleIndex + 1

      if (swapVisibleIndex < 0 || swapVisibleIndex >= searchableTimers.length) {
        return
      }

      const swapWithTimerId = searchableTimers[swapVisibleIndex]?.id.uuid
      if (!swapWithTimerId) return

      const sourceIndex = timers.findIndex((timer) => timer.id.uuid === timerId)
      const targetIndex = timers.findIndex(
        (timer) => timer.id.uuid === swapWithTimerId
      )

      if (sourceIndex < 0 || targetIndex < 0) return

      const reorderedTimers = [...timers]
      ;[reorderedTimers[sourceIndex], reorderedTimers[targetIndex]] = [
        reorderedTimers[targetIndex],
        reorderedTimers[sourceIndex],
      ]

      await saveTimerOrder(reorderedTimers)
      setSearchableTimers(reorderedTimers)
    },
    [searchableTimers, timers, saveTimerOrder]
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
        if (action === 'stop' && currentTimer?.id.uuid !== timer.id.uuid) return

        if (action === 'start') {
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
          // Every timer was just reset, so count down from the saved duration
          const duration = timer.countdown?.duration ?? 0
          setCurrentTimer({
            ...timer,
            state: 'running',
            remainingSeconds: duration,
          })
          localTimerRef.current.clearOvertime()
          await localTimerRef.current.handleLocalTimer('start', duration)
          return
        }

        localTimerRef.current.clearOvertime()
        await localTimerRef.current.handleLocalTimer('stop')
      }, `Failed to ${action} timer`)
    },
    [
      runOperation,
      currentTimer,
      setCurrentTimer,
      setAllTimersOperation,
      setTimerOperation,
      applyFluidTimersOperation,
      refetch,
      resetLocalTimerState,
    ]
  )

  // Save the edit form (create, rename, update or restart a timer)
  const handleSaveTimer = useCallback(
    async (timer: Timer, input: TimerEditInput): Promise<boolean> => {
      const isNew = timer.time === 'new'
      const isActive = !isNew && currentTimer?.id.uuid === timer.id.uuid
      const name =
        input.name.trim() || `Timer ${Math.floor(Math.random() * 1000)}`

      const plan = planTimerEdit({
        isNew,
        isActive,
        enteredSeconds: input.enteredSeconds,
        prefillSeconds: input.prefillSeconds,
      })

      if (plan.kind === 'invalid') {
        toastError(plan.message)
        return false
      }

      const withDuration = (duration: number, state: Timer['state']) => ({
        ...timer,
        id: { ...timer.id, name },
        countdown: { duration },
        remainingSeconds: duration,
        time: formatSecondsToTime(duration),
        state,
      })

      let successMessage = 'Timer updated successfully'

      const success = await runOperation(async () => {
        switch (plan.kind) {
          case 'create': {
            const created = await createTimer(plan.duration, name)
            updateTimerInList({
              ...created,
              remainingSeconds: plan.duration,
              state: 'stopped',
              time: formatSecondsToTime(plan.duration),
            })
            successMessage = 'Timer successfully created'
            return
          }

          case 'rename': {
            // Duration untouched: keep the clock running as it is
            await editTimer(timer.countdown?.duration ?? 0, name, timer.id.uuid)
            updateTimerInList({ ...timer, id: { ...timer.id, name } })
            return
          }

          case 'update': {
            await setTimerUpdateOperation(
              plan.duration,
              name,
              'reset',
              timer.id.uuid
            )
            updateTimerInList(withDuration(plan.duration, 'stopped'))
            await refetch()
            return
          }

          case 'restart': {
            // Restart from the new duration; this also clears overtime
            const restarted = withDuration(plan.duration, 'running')
            await setTimerUpdateOperation(
              plan.duration,
              name,
              'start',
              timer.id.uuid
            )
            await applyFluidTimersOperation(restarted, 'start')

            updateTimerInList(restarted)
            setCurrentTimer(restarted)
            localTimerRef.current.clearOvertime()
            await localTimerRef.current.handleLocalTimer('start', plan.duration)
            await refetch()
            return
          }
        }
      }, 'Failed to update timer')

      if (success) toastSuccess(successMessage)
      return success
    },
    [
      currentTimer,
      runOperation,
      createTimer,
      editTimer,
      setTimerUpdateOperation,
      applyFluidTimersOperation,
      updateTimerInList,
      setCurrentTimer,
      refetch,
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
          onSaveTimer={handleSaveTimer}
          onReorderTimer={handleReorderTimer}
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
