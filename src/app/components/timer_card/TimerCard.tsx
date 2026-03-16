'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import { Timer } from '../../interfaces/time'
import { TimerActions } from '../../hooks/timer'
import Watch from '../watch/Watch'
import { IoPlayOutline } from 'react-icons/io5'
import { LuTimerReset } from 'react-icons/lu'
import { AiOutlineEdit } from 'react-icons/ai'
import { MdOutlineDelete } from 'react-icons/md'
import { LocalTime } from '../../providers/timer'
import { BiFullscreen } from 'react-icons/bi'
import IconButton from '../ui/IconButton'
import { useCallback, useState } from 'react'
import { useSettings } from '@/app/providers/settings'
import { CgUnblock } from 'react-icons/cg'
import { TbLock } from 'react-icons/tb'
import Alert from '../ui/Alert'
import { toastWarning } from '@/lib/toastUtils'
import Modal from '../modals/Modal'
import Button from '../ui/Button'

interface TimerCardProps {
  timer: Timer
  isActive: boolean
  localTimer: LocalTime
  onOperation: (timer: Timer, action: TimerActions) => void
  onDelete: (uuid: string) => void
  onOpenFullScreen: (timer: Timer) => void
  onEditClick: () => void
}

export function TimerCard({
  timer,
  isActive,
  localTimer,
  onDelete,
  onOperation,
  onOpenFullScreen,
  onEditClick,
}: TimerCardProps) {
  const {
    fluidTimers,
    settings,
    addFluidTimer,
    removeFluidTimer,
    openSettingsDialog,
  } = useSettings()

  const hasLockPassword = Boolean(settings?.lock_password?.trim())
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false)
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('')

  const addFluidTime = useCallback(
    async (timer: Timer) => {
      if (typeof window === 'undefined' || !window.isTauri) {
        toastWarning('Fluid timers feature not available in browser mode')
        return
      }

      if (!hasLockPassword) {
        toastWarning('Set an unlock password in settings before locking timers')
        openSettingsDialog()
        return
      }

      await addFluidTimer({
        timer_id: timer.id.uuid,
        source: settings!.datastore,
        created_at: Date.now(),
      })
    },
    [addFluidTimer, settings, hasLockPassword, openSettingsDialog]
  )

  const openUnlockModal = useCallback(() => {
    if (!hasLockPassword) {
      toastWarning('No unlock password is configured. Set one in settings.')
      openSettingsDialog()
      return
    }

    setUnlockPasswordInput('')
    setIsUnlockModalOpen(true)
  }, [hasLockPassword, openSettingsDialog])

  const submitUnlockPassword = useCallback(async () => {
    if (!unlockPasswordInput.trim()) return

    if (unlockPasswordInput !== settings?.lock_password) {
      toastWarning('Incorrect unlock password')
      return
    }

    await removeFluidTimer(timer.id.uuid)
    setIsUnlockModalOpen(false)
    setUnlockPasswordInput('')
  }, [
    unlockPasswordInput,
    settings?.lock_password,
    removeFluidTimer,
    timer.id.uuid,
  ])

  return (
    <div
      className={
        'rounded-2xl p-6 shadow-sm border transition-all duration-300 hover:shadow-lg'
      }
      style={{
        background: 'var(--card)',
        border: isActive
          ? '1.5px solid var(--ring)'
          : '1.5px solid var(--border)',
        boxShadow: isActive
          ? '0 3px 14px 0 var(--ring), 0 1px 4px 0 var(--ring)'
          : undefined,
      }}
    >
      {/* Timer Header */}
      <div className='flex items-start justify-between mb-4'>
        <div className='flex-1'>
          <h2
            className='text-lg font-semibold mb-1'
            style={{ color: 'var(--card-foreground)' }}
          >
            {timer.id.name}
          </h2>
          {timer.countdown && (
            <div className='flex items-center gap-2 flex-wrap'>
              <span
                className='text-sm'
                style={{ color: 'var(--muted-foreground)' }}
              >
                Duration:
              </span>
              <span
                className='text-sm font-mono px-2 py-1 rounded-lg'
                style={{
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                }}
              >
                {formatSecondsToTime(timer.countdown.duration)}
              </span>
            </div>
          )}
        </div>
        {isActive && (
          <div
            className='flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium'
            style={{
              background: 'var(--green)',
              color: 'var(--card)',
            }}
          >
            <div
              className='w-2 h-2 rounded-full animate-pulse'
              style={{ background: 'var(--card)' }}
            ></div>
            Active
          </div>
        )}
        {fluidTimers.includes(timer.id.uuid) && (
          <IconButton
            style={{ color: 'var(--destructive)' }}
            icon={<CgUnblock size={30} />}
            tooltip='Unlock for editing'
            tooltipPosition='top'
            onClick={openUnlockModal}
          />
        )}
      </div>

      {timer.countdown ? (
        <div className='space-y-4'>
          {isActive && (
            <div className='flex items-stretch'>
              <div
                className='flex-3 rounded-l-xl p-2 border'
                style={{
                  background: 'var(--accent)',
                  border: '1.5px solid var(--border)',
                }}
              >
                <Watch
                  mode='normal'
                  isInjuryTime={
                    localTimer.totalSeconds <
                    (timer?.countdown?.duration ?? 0) * 0.2
                  }
                  hours={localTimer.hours}
                  minutes={localTimer.minutes}
                  seconds={localTimer.seconds}
                  overtime={localTimer.overtime}
                  fullscreen={false}
                />
              </div>
              <IconButton
                className='rounded-r-xl rounded-l-none flex-1 flex has-tooltip max-w-[60px]'
                style={{ color: 'var(--ring)', background: 'var(--slate)' }}
                icon={<BiFullscreen size={40} className='inline' />}
                tooltip='Open fullscreen'
                tooltipPosition='top'
                onClick={() => onOpenFullScreen(timer)}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-8 flex-wrap'>
            {fluidTimers.includes(timer.id.uuid) ? (
              <Alert
                title=''
                type='info'
                message='This event should remain locked. Modifying it would compromise the integrity of the ProPresenter screen configuration.
                  It must remain locked for the screens to function correctly. DO NOT DELETE'
              ></Alert>
            ) : (
              <>
                <IconButton
                  disabled={
                    (localTimer.isRunning || localTimer.overtime.isRunning) && isActive
                  }
                  style={{ color: 'var(--green)' }}
                  icon={<IoPlayOutline size={30} />}
                  tooltip='Start'
                  tooltipPosition='top'
                  onClick={() => onOperation(timer, 'start')}
                />
                <IconButton
                  disabled={
                    (localTimer.isRunning || localTimer.overtime.isRunning) &&
                    !isActive
                  }
                  style={{ color: 'var(--ring)' }}
                  icon={<LuTimerReset size={30} />}
                  tooltip='Reset'
                  tooltipPosition='top'
                  onClick={() => onOperation(timer, 'reset')}
                />
                <IconButton
                  style={{ color: 'var(--ring)' }}
                  icon={<AiOutlineEdit size={30} />}
                  tooltip='Edit'
                  tooltipPosition='top'
                  onClick={onEditClick}
                />
                <IconButton
                  style={{ color: 'var(--ring)' }}
                  icon={<TbLock size={30} />}
                  tooltip='Lock from deleting'
                  tooltipPosition='top'
                  onClick={() => addFluidTime(timer)}
                />
                <IconButton
                  style={{ color: 'var(--destructive)' }}
                  icon={<MdOutlineDelete size={30} />}
                  tooltip='Delete'
                  tooltipPosition='top'
                  onClick={() => onDelete(timer.id.uuid)}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className='text-center py-6'>
          <p
            className='text-sm font-medium'
            style={{ color: 'var(--muted-foreground)' }}
          >
            Timer Config Not Supported
          </p>
        </div>
      )}

      <Modal
        open={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        title='Unlock Timer'
        size='sm'
      >
        <div className='space-y-4'>
          <p style={{ color: 'var(--muted-foreground)' }} className='text-sm'>
            Enter the unlock password to continue.
          </p>
          <input
            type='password'
            value={unlockPasswordInput}
            onChange={(e) => setUnlockPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitUnlockPassword()
              }
            }}
            className='w-full p-2 border rounded-lg bg-background border-input placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background outline-none'
            placeholder='Password'
            autoFocus
          />
          <div className='flex gap-2 justify-end'>
            <Button
              variant='secondary'
              type='button'
              onClick={() => setIsUnlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              type='button'
              onClick={submitUnlockPassword}
              disabled={!unlockPasswordInput.trim()}
            >
              Unlock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
