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

  // Ref to track if we're currently performing an operation
  const operationInProgress = useRef(false)

  // Handle URL search params on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setShowTime(urlParams.get('showTime') === 'true')
    }
  }, [])

  const fetchTimers = useCallback(async () => {
    if (!proPresenterUrl) {
      setError('ProPresenter URL not configured')
      return []
    }

    try {
      const data = await fetchTimersApi(proPresenterUrl)
      setSearchableTimers(data)
      setTimers(data)
      setError(null)
      return data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch timers'
      console.error('Failed to fetch timers:', error)
      setError(errorMessage)
      return []
    }
  }, [proPresenterUrl])

  const resetAllTimers = useCallback(
    async (action: TimerActions) => {
      if (!proPresenterUrl) {
        setError('ProPresenter URL not configured')
        return
      }

      if (operationInProgress.current) {
        return
      }

      try {
        operationInProgress.current = true
        await setAllTimersOperationApi(proPresenterUrl, action)
        const updatedTimers = await fetchTimersApi(proPresenterUrl)
        setSearchableTimers(updatedTimers)
        setTimers(updatedTimers)
        setCurrentTimer(null)
        localTimer.overtime.reset(undefined, false)
        localTimer.handleLocalTimer('reset')
        setError(null)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to reset timers'
        console.error('Failed to reset timers:', error)
        setError(errorMessage)
      } finally {
        operationInProgress.current = false
      }
    },
    [proPresenterUrl, setCurrentTimer, localTimer]
  )

  // Initial load - sync with ProPresenter state
  useEffect(() => {
    if (!isInitialized && proPresenterUrl) {
      const loadTimers = async () => {
        try {
          // Fetch current state without resetting
          const fetched = await fetchTimersApi(proPresenterUrl)
          setSearchableTimers(fetched)
          setTimers(fetched)

          // Check if any timer is currently running
          const runningTimer = fetched.find((d) =>
            ['running', 'overrunning'].includes(d.state)
          )

          if (runningTimer) {
            setCurrentTimer(runningTimer)

            if (runningTimer.state === 'running') {
              localTimer.handleLocalTimer(
                'start',
                runningTimer.remainingSeconds
              )
            } else if (runningTimer.state === 'overrunning') {
              const timestamp = new Date().valueOf()
              localTimer.overtime.reset(
                new Date(
                  timestamp + (runningTimer.remainingSeconds ?? 0) * 1000
                ),
                true
              )
            }
          }

          setError(null)
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to initialize timers'
          console.error('Failed to initialize timers:', error)
          setError(errorMessage)
        } finally {
          setIsInitialized(true)
        }
      }

      loadTimers()
    }
  }, [proPresenterUrl, isInitialized, setCurrentTimer, localTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fullscreenWindow && !fullscreenWindow.closed) {
        fullscreenWindow.close()
      }
    }
  }, [fullscreenWindow])

  const handleDelete = useCallback(
    async (uuid: string) => {
      if (!proPresenterUrl) {
        setError('ProPresenter URL not configured')
        return
      }

      if (operationInProgress.current) {
        return
      }

      try {
        operationInProgress.current = true
        await deleteTimerApi(proPresenterUrl, uuid)

        // Update local state
        setTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))
        setSearchableTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))

        // Reset current timer if it was deleted
        if (currentTimer?.id.uuid === uuid) {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('reset')
          localTimer.overtime.reset(undefined, false)
        }

        setError(null)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete timer'
        console.error('Failed to delete timer:', error)
        setError(errorMessage)
      } finally {
        operationInProgress.current = false
      }
    },
    [proPresenterUrl, currentTimer?.id.uuid, setCurrentTimer, localTimer]
  )

  const handleOperation = useCallback(
    async (timer: Timer, action: TimerActions) => {
      if (!proPresenterUrl) {
        setError('ProPresenter URL not configured')
        return
      }

      if (operationInProgress.current) {
        return
      }

      try {
        operationInProgress.current = true

        // Prevent duplicate start/stop operations
        if (localTimer.isRunning && action === 'start') {
          return
        }

        if (!localTimer.isRunning && action === 'stop') {
          return
        }

        // Reset overtime when performing any operation
        localTimer.overtime.reset(undefined, false)

        // Perform API operation first
        await setTimerOperationApi(proPresenterUrl, action, timer.id.uuid)

        // Update local state based on action
        if (action === 'reset') {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('reset')
        } else {
          setCurrentTimer(timer)
          localTimer.handleLocalTimer(action, timer.remainingSeconds)
        }

        // Fetch updated timer states
        const updatedTimers = await fetchTimersApi(proPresenterUrl)
        setTimers(updatedTimers)
        setSearchableTimers(updatedTimers)

        setError(null)
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to perform timer operation'
        console.error('Failed to perform timer operation:', error)
        setError(errorMessage)
      } finally {
        operationInProgress.current = false
      }
    },
    [localTimer, setCurrentTimer, proPresenterUrl]
  )

  const handleEdit = useCallback((timer: Timer) => {
    setTimerToEdit(timer)
    setIsEditTimerModalOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setTimerToEdit(null)
    setIsEditTimerModalOpen(false)
  }, [])

  const handleOpenFullScreen = useCallback(async () => {
    try {
      await openNewWindow(
        <iframe
          src='/?showTime=true'
          width='100%'
          height='100%'
          allow='window-management'
          title='Timer Fullscreen'
        ></iframe>
      )
    } catch (error) {
      console.error('Failed to open fullscreen:', error)
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
      if (!term.trim()) {
        setSearchableTimers(timers)
        return
      }

      const result = timers.filter((item) =>
        item.id.name.toLowerCase().includes(term.toLowerCase())
      )

      setSearchableTimers(result)
    },
    [timers]
  )

  const refreshTimers = useCallback(async () => {
    if (!proPresenterUrl) {
      setError('ProPresenter URL not configured')
      return
    }

    try {
      const data = await fetchTimersApi(proPresenterUrl)
      setTimers(data)
      setSearchableTimers(data)
      setError(null)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to refresh timers'
      console.error('Failed to refresh timers:', error)
      setError(errorMessage)
    }
  }, [proPresenterUrl])

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
              /* Timer Grid */
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
        ></WatchLayoutWithProps>
      )}
    </main>
  )
}
