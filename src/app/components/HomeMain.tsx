'use client'

import { Header } from './ui/Header'
import EmptyTimer from './EmptyTimer'
import { TimerCardContainer } from './timer_card/TimerCardContainer'
import SettingsDialog from './modals/SettingsDialog'
import About from './modals/About'
import { Timer } from '../interfaces/time'
import { useCallback, useEffect, useRef, useState } from 'react'

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
}
import { LocalTime, useShared } from '../providers/timer'
import { toastError, toastSuccess } from '@/lib/toastUtils'
import useSecondScreenDisplay from '../hooks/secondary_display/useSecondaryDisplay'
import { useSettings } from '../providers/settings'
import { TimerActions } from '../hooks/timer'
import { TimerCardEdit } from './timer_card/TimerCardEdit'
import { BiPlus } from 'react-icons/bi'
import IconButton from './ui/IconButton'

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
}: HomeMainProps) {
  const [isCreatingTimer, setIsCreatingTimer] = useState(false)
  const [openAbout, setOpenAbout] = useState(false)
  const { fullscreenWindow } = useShared()
  const { openNewWindow, closeTauriWindow } = useSecondScreenDisplay()
  const { openSettingsDialog } = useSettings()

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
    try {
      await openNewWindow()
    } catch (err) {
      toastError(
        `Failed to open fullscreen window - ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
      )
    }
  }, [openNewWindow])

  const handleExitFullscreen = useCallback(async () => {
    if (typeof window !== 'undefined' && window.isTauri) {
      await closeTauriWindow()
    }

    if (fullscreenWindow && !fullscreenWindow.closed) {
      fullscreenWindow.close()
    }
    toastSuccess('External screen closed')
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
      />
      <div className='max-w-6xl mx-auto px-6 py-8'>
        {searchableTimers.length === 0 ? (
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
