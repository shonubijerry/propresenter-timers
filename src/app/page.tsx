'use client'

import { useEffect, useState, useCallback } from 'react'
import { Timer } from './interfaces/time'
import { TimerActions } from './hooks/timer'
import CreateTimerModal from './components/CreateTimerModal'
import { TimerCard } from './components/TimerCardContent'
import { Header } from './components/ui/Header'
import EmptyTimer from './components/EmptyTimer'
import WatchLayoutWithProps from './components/WatchLayout'
import EditTimerModal from './components/EditTimerModal'
import { useShared } from './providers/timer'
import {
  deleteTimerApi,
  fetchTimersApi,
  setAllTimersOperationApi,
  setTimerOperationApi,
} from './hooks/proPresenterApi'
import SettingsDialog from './components/SettingsDialog'
import { useSettings } from './providers/settings'
import useSecondScreenDisplay from './hooks/SecondaryScreenDisplay'

export default function Home() {
  const [isCreateTimerModalOpen, setIsCreateTimerModalOpen] = useState(false)
  const [isEditTimerModalOpen, setIsEditTimerModalOpen] = useState(false)
  const [timerToEdit, setTimerToEdit] = useState<Timer | null>(null)
  const [timers, setTimers] = useState<Timer[]>([])
  const [showTime, setShowTime] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const {
    currentTimer,
    setCurrentTimer,
    localTimer,
    fullscreenWindow,
  } = useShared()
  const { openNewWindow } = useSecondScreenDisplay()

  const { openSettingsDialog, proPresenterUrl, isLoading } = useSettings()

  // Handle URL search params on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setShowTime(urlParams.get('showTime') === 'true')
    }
  }, [])

  const updateTimers = useCallback((timer: Timer) => {
    setTimers((prevTimers) =>
      prevTimers.map((p) => {
        if (p.id.uuid === timer.id.uuid) {
          return timer
        }

        return p
      })
    )
  }, [])

  const fetchTimers = useCallback(async () => {
    if (!proPresenterUrl) {
      return []
    }

    try {
      const data = await fetchTimersApi(proPresenterUrl)
      setTimers(data)
      return data
    } catch (error) {
      console.error('Failed to fetch timers:', error)
      return []
    }
  }, [proPresenterUrl])

  // Initial load and URL changes
  useEffect(() => {
    if (!isInitialized && proPresenterUrl) {
      const loadTimers = async () => {
        const fetched = await fetchTimers()

        const runningTimer = fetched.find((d) =>
          ['running', 'overrunning'].includes(d.state)
        )

        if (runningTimer && runningTimer.state === 'running') {
          setCurrentTimer(runningTimer)
          localTimer.handleLocalTimer('start', runningTimer.remainingSeconds)
        } else if (runningTimer && runningTimer.state === 'overrunning') {
          setCurrentTimer(runningTimer)
          const timestamp = new Date().valueOf()
          localTimer.overtime.reset(
            new Date(timestamp + (runningTimer.remainingSeconds ?? 0) * 1000),
            true
          )
        }

        setIsInitialized(true)
      }

      loadTimers()
    }
  }, [proPresenterUrl, isInitialized, fetchTimers, setCurrentTimer, localTimer])

  // Fetch timers whenever proPresenterUrl changes (after initialization)
  useEffect(() => {
    if (isInitialized && proPresenterUrl) {
      fetchTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proPresenterUrl, isInitialized])

  const handleDelete = useCallback(
    async (uuid: string) => {
      try {
        await deleteTimerApi(uuid)
        setTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))

        if (currentTimer?.id.uuid === uuid) {
          setCurrentTimer(null)
          localTimer.handleLocalTimer('stop')
        }
      } catch (error) {
        console.error('Failed to delete timer:', error)
      }
    },
    [currentTimer?.id.uuid, setCurrentTimer, localTimer]
  )

  const handleOperation = useCallback(
    async (timer: Timer, action: TimerActions) => {
      try {
        localTimer.overtime.reset(undefined, false)

        if (localTimer.isRunning && action === 'start') {
          return
        }

        if (!localTimer.isRunning && action === 'stop') {
          return
        }

        setCurrentTimer(timer)

        if (action === 'reset') {
          setCurrentTimer(null)
        }

        await setTimerOperationApi(proPresenterUrl, action, timer.id.uuid)
        localTimer.handleLocalTimer(action, timer.remainingSeconds)
        await fetchTimers()
      } catch (error) {
        console.error('Failed to perform timer operation:', error)
      }
    },

    [localTimer, setCurrentTimer, proPresenterUrl, fetchTimers]
  )

  const resetAllTimers = async (action: TimerActions) => {
    try {
      await setAllTimersOperationApi(proPresenterUrl, action)
      await fetchTimers()
      setCurrentTimer(null)
      localTimer.overtime.reset(undefined, false)
      localTimer.handleLocalTimer('reset')
    } catch (e) {
      console.log(e)
    }
  }

  const handleEdit = useCallback((timer: Timer) => {
    setTimerToEdit(timer)
    setIsEditTimerModalOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setTimerToEdit(null)
    setIsEditTimerModalOpen(false)
  }, [])

  const handleOpenFullScreen = useCallback(async () => {
    await openNewWindow(
      <iframe
        src='/?showTime=true'
        width='100%'
        height='100%'
        allow='window-management'
      ></iframe>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100/70'>
      {!showTime ? (
        <>
          <Header
            setIsModalOpen={setIsCreateTimerModalOpen}
            openSettings={openSettingsDialog}
            onExitFullscreen={() => {
              fullscreenWindow?.close()
            }}
            resetAllTimers={resetAllTimers}
          />
          <div className='max-w-6xl mx-auto px-6 py-8'>
            {timers.length === 0 ? (
              <EmptyTimer openSettings={openSettingsDialog} />
            ) : (
              /* Timer Grid */
              <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
                {timers.map((timer) => (
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
