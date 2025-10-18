'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Timer } from './interfaces/time'
import { TimerActions } from './hooks/timer'
import CreateTimerModal from './components/modals/CreateTimerModal'
import { TimerCard } from './components/TimerCardContent'
import { Header } from './components/ui/Header'
import EmptyTimer from './components/EmptyTimer'
import WatchLayoutWithProps from './components/WatchLayout'
import EditTimerModal from './components/modals/EditTimerModal'
import { useShared } from './providers/timer'
import {
  deleteTimerApi,
  fetchTimersApi,
  setAllTimersOperationApi,
  setTimerOperationApi,
} from './hooks/proPresenterApi'
import SettingsDialog from './components/modals/SettingsDialog'
import { useSettings } from './providers/settings'
import useSecondScreenDisplay from './hooks/SecondaryScreenDisplay'

export default function Home() {
  const [isCreateTimerModalOpen, setIsCreateTimerModalOpen] = useState(false)
  const [isEditTimerModalOpen, setIsEditTimerModalOpen] = useState(false)
  const [timerToEdit, setTimerToEdit] = useState<Timer | null>(null)
  const [timers, setTimers] = useState<Timer[]>([])
  const [searchableTimers, setSearchableTimers] = useState<Timer[]>([])
  const [showTime, setShowTime] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTimer, setCurrentTimer, localTimer, fullscreenWindow } =
    useShared()
  const { openNewWindow } = useSecondScreenDisplay()
  const { openSettingsDialog, proPresenterUrl, isLoading } = useSettings()

  const operationInProgress = useRef(false)

  // Helper to set and log API errors
  const setApiError = useCallback(
    (err: unknown, fallback = 'An error occurred') => {
      const message = err instanceof Error ? err.message : fallback
      console.error(fallback + ':', err)
      setError(message)
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
        setError(null)
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
    if (!proPresenterUrl) {
      const msg = 'ProPresenter URL not configured'
      setError(msg)
      return []
    }

    try {
      const data = await fetchTimersApi(proPresenterUrl)
      setTimers(data)
      setSearchableTimers(data)
      setError(null)
      return data
    } catch (err) {
      setApiError(err, 'Failed to fetch timers')
      return []
    }
  }, [proPresenterUrl, setApiError])

  // Load initial timers and sync running state with local timer
  useEffect(() => {
    if (isInitialized || !proPresenterUrl) return

    let mounted = true

    ;(async () => {
      try {
        const fetched = await fetchTimers()

        if (!mounted) return

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

        setError(null)
      } catch (err) {
        setApiError(err, 'Failed to initialize timers')
      } finally {
        if (mounted) setIsInitialized(true)
      }
    })()

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

  // Cleanup fullscreen window on unmount
  useEffect(() => {
    return () => {
      if (fullscreenWindow && !fullscreenWindow.closed) {
        fullscreenWindow.close()
      }
    }
  }, [fullscreenWindow])

  // Reset all timers (start/stop/reset for all)
  const resetAllTimers = useCallback(
    async (action: TimerActions) => {
      if (!proPresenterUrl) {
        setError('ProPresenter URL not configured')
        return
      }

      await runOperation(async () => {
        await setAllTimersOperationApi(proPresenterUrl, action)
        await fetchTimers()
        setCurrentTimer(null)
        localTimer.overtime.reset(undefined, false)
        localTimer.handleLocalTimer('reset')
      }, 'Failed to reset timers')
    },
    [proPresenterUrl, runOperation, setCurrentTimer, localTimer, fetchTimers]
  )

  // Delete a timer
  const handleDelete = useCallback(
    async (uuid: string) => {
      if (!proPresenterUrl) {
        setError('ProPresenter URL not configured')
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
        setError('ProPresenter URL not configured')
        return
      }

      await runOperation(async () => {
        if (localTimer.isRunning && action === 'start') return
        if (!localTimer.isRunning && action === 'stop') return

        localTimer.overtime.reset(undefined, false)
        await setTimerOperationApi(proPresenterUrl, action, timer.id.uuid)

        if (action === 'reset') {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('reset')
        } else {
          setCurrentTimer(timer)
          localTimer.handleLocalTimer(action, timer.remainingSeconds)
        }

        // Refresh timers after operation
        await fetchTimers()
      }, 'Failed to perform timer operation')
    },
    [proPresenterUrl, runOperation, localTimer, setCurrentTimer, fetchTimers]
  )

  const handleEdit = useCallback((timer: Timer) => {
    setTimerToEdit(timer)
    setIsEditTimerModalOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setTimerToEdit(null)
    setIsEditTimerModalOpen(false)
  }, [])

  // Open the fullscreen window with the watch layout
  const handleOpenFullScreen = useCallback(async () => {
    try {
      await openNewWindow(
        <iframe
          src='/?showTime=true'
          width='100%'
          height='100%'
          allow='window-management'
          title='Timer Fullscreen'
        />,
        setError
      )
    } catch (err) {
      console.error('Failed to open fullscreen:', err)
      setError('Failed to open fullscreen window')
    }
  }, [openNewWindow])

  const handleExitFullscreen = useCallback(() => {
    if (fullscreenWindow && !fullscreenWindow.closed) {
      fullscreenWindow.close()
    }
  }, [fullscreenWindow])

  const onSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim()
      if (!trimmed) {
        setSearchableTimers(timers)
        return
      }
      const lowered = trimmed.toLowerCase()
      setSearchableTimers(
        timers.filter((item) => item.id.name.toLowerCase().includes(lowered))
      )
    },
    [timers]
  )

  const refreshTimers = useCallback(async () => {
    if (!proPresenterUrl) {
      setError('ProPresenter URL not configured')
      return
    }

    try {
      setSearchableTimers([])
      await fetchTimers()
      setError(null)
    } catch (err) {
      setApiError(err, 'Failed to refresh timers')
    }
  }, [proPresenterUrl, setApiError, fetchTimers])

  const updateTimers = useCallback(async () => {
    await refreshTimers()
  }, [refreshTimers])

  if (isLoading) {
    return (
      <main className='min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100/70 flex items-center justify-center'>
        <div className='text-xl text-blue-600'>Loading...</div>
      </main>
    )
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100/70'>
      {!showTime ? (
        <>
          <Header
            setIsModalOpen={setIsCreateTimerModalOpen}
            openSettings={openSettingsDialog}
            onExitFullscreen={handleExitFullscreen}
            resetAllTimers={resetAllTimers}
            refreshTimers={refreshTimers}
            onSearch={onSearch}
          />
          <div className='max-w-6xl mx-auto px-6 py-8'>
            {error && (
              <div className='mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
                {error}
              </div>
            )}

            {searchableTimers.length === 0 ? (
              <EmptyTimer openSettings={openSettingsDialog} />
            ) : (
              <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
                {searchableTimers.map((timer) => (
                  <TimerCard
                    key={timer.id.uuid}
                    timer={timer}
                    isActive={currentTimer?.id?.uuid === timer.id.uuid}
                    localTimer={localTimer}
                    onOperation={handleOperation}
                    onDelete={handleDelete}
                    onOpenFullScreen={handleOpenFullScreen}
                    onEdit={() => handleEdit(timer)}
                  />
                ))}
              </div>
            )}
          </div>

          <CreateTimerModal
            open={isCreateTimerModalOpen}
            onClose={() => setIsCreateTimerModalOpen(false)}
            onCreated={updateTimers}
          />

          <EditTimerModal
            timer={timerToEdit}
            open={isEditTimerModalOpen}
            onClose={handleCloseEdit}
            onUpdated={updateTimers}
          />

          <SettingsDialog />
        </>
      ) : (
        <WatchLayoutWithProps
          localTimer={localTimer}
          fullscreen={true}
          duration={currentTimer?.countdown?.duration ?? 0}
          description={currentTimer?.id.name}
          timeTracker={localTimer.overtime.isRunning ? 'Time Up' : 'Time Left'}
          isInjuryTime={
            localTimer.totalSeconds <
            (currentTimer?.countdown?.duration ?? 0) * 0.2
          }
        />
      )}
    </main>
  )
}
