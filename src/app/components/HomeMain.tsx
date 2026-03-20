'use client'

import { Header } from './ui/Header'
import EmptyTimer from './EmptyTimer'
import { TimerCardContainer } from './timer_card/TimerCardContainer'
import SettingsDialog from './modals/SettingsDialog'
import About from './modals/About'
import BroadcastDialog from './modals/BroadcastDialog'
import AnalyticsDialog from './modals/AnalyticsDialog'
import { Timer } from '../interfaces/time'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LocalTime, useShared } from '../providers/timer'
import { toastError, toastInfo } from '@/lib/toastUtils'
import useSecondScreenDisplay from '../hooks/secondary_display/useSecondaryDisplay'
import { useSettings } from '../providers/settings'
import { TimerActions } from '../hooks/timer'
import { TimerCardEdit } from './timer_card/TimerCardEdit'
import { BiPlus } from 'react-icons/bi'
import IconButton from './ui/IconButton'
import { TimerAnalyticsRangeSummary } from '../interfaces/analytics'

interface HomeMainProps {
  searchableTimers: Timer[]
  currentTimer?: Timer | null
  localTimer: LocalTime
  handleOperation: (timer: Timer, action: TimerActions) => Promise<void>
  handleDelete: (uuid: string) => Promise<void>
  resetAllTimers: (action: TimerActions) => Promise<void>
  refreshTimers: () => Promise<void>
  updateTimerInList: (timer: Timer) => void
  onSearch: (term: string) => void
  onLoadAnalytics: (
    fromDate: string,
    toDate: string
  ) => Promise<TimerAnalyticsRangeSummary>
}

export default function HomeMain({
  searchableTimers,
  currentTimer,
  localTimer,
  handleOperation,
  handleDelete,
  resetAllTimers,
  refreshTimers,
  updateTimerInList,
  onSearch,
  onLoadAnalytics,
}: HomeMainProps) {
  const [isCreatingTimer, setIsCreatingTimer] = useState(false)
  const [openAbout, setOpenAbout] = useState(false)
  const [openBroadcast, setOpenBroadcast] = useState(false)
  const [openAnalytics, setOpenAnalytics] = useState(false)
  const { fullscreenWindow } = useShared()
  const { openNewWindow, closeTauriWindow } = useSecondScreenDisplay()
  const { openSettingsDialog, db, activeProfile } = useSettings()

  const createTimerRef = useRef(null as unknown as HTMLElement)

  useEffect(() => {
    return () => {
      if (fullscreenWindow && !fullscreenWindow.closed) {
        fullscreenWindow.close()
      }
    }
  }, [fullscreenWindow])

  useEffect(() => {
    if (isCreatingTimer && createTimerRef.current) {
      createTimerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [isCreatingTimer])

  const handleOpenFullScreen = useCallback(async () => {
    await openNewWindow().catch((err) => {
      toastError(
        `Failed to open fullscreen window - ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
      )
    })
  }, [openNewWindow])

  const handleExitFullscreen = useCallback(async () => {
    if (typeof window !== 'undefined' && window.isTauri) {
      await closeTauriWindow()
    }

    if (fullscreenWindow && !fullscreenWindow.closed) {
      fullscreenWindow.close()
    }
    toastInfo('External screen and preview closed')
  }, [fullscreenWindow, closeTauriWindow])

  const toggleAboutModal = () => {
    setOpenAbout(!openAbout)
  }

  return (
    <>
      <Header
        openSettings={openSettingsDialog}
        onExitFullscreen={handleExitFullscreen}
        resetAllTimers={resetAllTimers}
        refreshTimers={refreshTimers}
        onSearch={onSearch}
        toggleAboutModal={toggleAboutModal}
        openBroadcastModal={() => setOpenBroadcast(true)}
        openAnalyticsModal={() => setOpenAnalytics(true)}
        activeProfileName={activeProfile.name}
      />
      <div className='max-w-6xl mx-auto px-6 py-8'>
        {searchableTimers.length === 0 && !isCreatingTimer ? (
          <EmptyTimer openSettings={openSettingsDialog} />
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
            {searchableTimers.map((timer: Timer) => (
              <TimerCardContainer
                key={timer.id.uuid}
                timer={timer}
                isActive={currentTimer?.id?.uuid === timer.id.uuid}
                localTimer={localTimer}
                onOperation={handleOperation}
                onDelete={handleDelete}
                onOpenFullScreen={handleOpenFullScreen}
                onEdit={updateTimerInList}
              />
            ))}
            {isCreatingTimer && (
              <span ref={createTimerRef}>
                <TimerCardEdit
                  timer={{
                    id: { index: searchableTimers.length, uuid: '', name: '' },
                    countdown: { duration: 300 },
                    allows_overrun: true,
                    state: 'stopped',
                    time: 'new',
                    remainingSeconds: 300,
                  }}
                  isActive={false}
                  onCancel={() => setIsCreatingTimer(false)}
                  onSave={(createdTimer) => {
                    setIsCreatingTimer(false)
                    updateTimerInList(createdTimer)
                  }}
                />
              </span>
            )}
          </div>
        )}
      </div>
      <SettingsDialog />
      <BroadcastDialog
        open={openBroadcast}
        onClose={() => setOpenBroadcast(false)}
      />
      <AnalyticsDialog
        open={openAnalytics}
        onClose={() => setOpenAnalytics(false)}
        isAvailable={Boolean(db)}
        onLoad={onLoadAnalytics}
      />
      <About open={openAbout} onClose={toggleAboutModal} />
      <IconButton
        className='fixed bottom-10 right-14 z-50 hover:bg-blue-600 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200'
        style={{
          color: 'var(--destructive-foreground)',
          background: 'var(--primary)',
        }}
        icon={<BiPlus size={40} />}
        onClick={() => setIsCreatingTimer(true)}
      />
    </>
  )
}
