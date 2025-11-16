'use client'

import { Header } from './ui/Header'
import EmptyTimer from './EmptyTimer'
import { TimerCard } from './TimerCardContent'
import CreateTimerModal from './modals/CreateTimerModal'
import SettingsDialog from './modals/SettingsDialog'
import About from './modals/About'
import { Timer } from '../interfaces/time'
import { useCallback, useEffect, useState } from 'react'

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
  const [isCreateTimerModalOpen, setIsCreateTimerModalOpen] = useState(false)
  const [openAbout, setOpenAbout] = useState(false)
  const { fullscreenWindow } = useShared()
  const { openNewWindow, closeTauriWindow } = useSecondScreenDisplay()
  const { openSettingsDialog } = useSettings()

  useEffect(() => {
    return () => {
      if (fullscreenWindow && !fullscreenWindow.closed) {
        fullscreenWindow.close()
      }
    }
  }, [fullscreenWindow])

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
        setIsModalOpen={setIsCreateTimerModalOpen}
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
              <TimerCard
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
          </div>
        )}
      </div>
      <CreateTimerModal
        open={isCreateTimerModalOpen}
        onClose={() => setIsCreateTimerModalOpen(false)}
        onCreated={updateTimerInList}
      />
      <SettingsDialog />
      <About open={openAbout} onClose={toggleAboutModal} />
    </>
  )
}
