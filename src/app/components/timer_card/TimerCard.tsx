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
import { useCallback, useMemo, useState } from 'react'
import { useSettings } from '@/app/providers/settings'
import { CgUnblock } from 'react-icons/cg'
import { TbLock } from 'react-icons/tb'
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
  const isFluidTimer = fluidTimers.includes(timer.id.uuid)
  const hasCountdown = Boolean(timer.countdown)
  const isAnyTimerRunning =
    localTimer.isRunning || localTimer.overtime.isRunning
  const isInjuryTime =
    localTimer.totalSeconds < (timer?.countdown?.duration ?? 0) * 0.2

  const addFluidTime = useCallback(
    async (timer: Timer) => {
      if (typeof window === 'undefined' || !window.isTauri) {
        toastWarning('Fluid timers feature not available in browser mode')
        return
      }

      if (!hasLockPassword) {
        toastWarning('Set an unlock password in settings before locking timers')
        openSettingsDialog('security')
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
      openSettingsDialog('security')
      return
    }

    setUnlockPasswordInput('')
    setIsUnlockModalOpen(true)
  }, [hasLockPassword, openSettingsDialog])

  const actionButtons = useMemo(
    () => [
      {
        key: 'start',
        label: 'Start',
        icon: <IoPlayOutline size={20} />,
        onClick: () => onOperation(timer, 'start'),
        disabled: isAnyTimerRunning && isActive,
        color: 'var(--green)',
      },
      {
        key: 'reset',
        label: 'Reset',
        icon: <LuTimerReset size={20} />,
        onClick: () => onOperation(timer, 'reset'),
        disabled: isAnyTimerRunning && !isActive,
        color: 'var(--ring)',
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: <AiOutlineEdit size={20} />,
        onClick: onEditClick,
        color: 'var(--ring)',
      },
      {
        key: 'lock',
        label: 'Lock from deleting',
        icon: <TbLock size={20} />,
        onClick: () => addFluidTime(timer),
        color: 'var(--ring)',
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <MdOutlineDelete size={20} />,
        onClick: () => onDelete(timer.id.uuid),
        color: 'var(--destructive)',
      },
    ],
    [
      addFluidTime,
      isActive,
      isAnyTimerRunning,
      onDelete,
      onEditClick,
      onOperation,
      timer,
    ]
  )

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
      className='group rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg'
      style={{
        background: 'var(--surface-1)',
        border: isActive
          ? '1.5px solid var(--ring)'
          : '1.5px solid var(--border)',
        boxShadow: isActive
          ? '0 8px 24px -18px var(--ring), 0 2px 8px 0 color-mix(in srgb, var(--ring) 40%, transparent)'
          : 'var(--surface-shadow-sm)',
      }}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5 mb-2'>
            <span
              className='inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]'
              style={{
                background: isActive
                  ? 'color-mix(in srgb, var(--ring) 12%, var(--surface-3) 88%)'
                  : 'var(--surface-2)',
                color: isActive ? 'var(--ring)' : 'var(--muted-foreground)',
              }}
            >
              {isActive ? 'Live Timer' : 'Ready'}
            </span>
            {isFluidTimer ? (
              <span
                className='inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]'
                style={{
                  background:
                    'color-mix(in srgb, var(--destructive) 10%, var(--surface-2) 90%)',
                  color: 'var(--destructive)',
                }}
              >
                Locked
              </span>
            ) : null}
          </div>

          <h2
            className='text-base sm:text-lg font-semibold mb-2 truncate'
            style={{ color: 'var(--card-foreground)' }}
          >
            {timer.id.name}
          </h2>
          {hasCountdown ? (
            <div className='flex items-center gap-2 text-sm'>
              <div
                className='inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 border'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                }}
              >
                <p
                  className='text-[10px] font-semibold uppercase tracking-[0.14em]'
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Duration
                </p>
                <p
                  className='text-sm font-mono'
                  style={{ color: 'var(--foreground)' }}
                >
                  {formatSecondsToTime(timer.countdown!.duration)}
                </p>
              </div>
              <div
                className='inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 border'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                }}
              >
                <p
                  className='text-[10px] font-semibold uppercase tracking-[0.14em]'
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Status
                </p>
                <p
                  className='text-sm font-medium capitalize'
                  style={{ color: 'var(--foreground)' }}
                >
                  {timer.state}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className='flex items-center gap-2'>
          {isActive ? (
            <div
              className='flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap'
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
          ) : null}

          {isFluidTimer ? (
            <IconButton
              className='h-9 w-9 rounded-xl border hover:bg-accent hover:text-accent-foreground'
              style={{
                color: 'var(--destructive)',
                borderColor: 'var(--border)',
                background:
                  'color-mix(in srgb, var(--destructive) 6%, var(--surface-2) 94%)',
              }}
              icon={<CgUnblock size={20} />}
              tooltip='Unlock for editing'
              tooltipPosition='top'
              onClick={openUnlockModal}
            />
          ) : null}
        </div>
      </div>

      {hasCountdown ? (
        <div className='space-y-3 mt-3'>
          {isActive && (
            <div
              className='rounded-xl border p-2.5'
              style={{
                background:
                  'linear-gradient(135deg, var(--surface-3) 0%, var(--surface-2) 100%)',
                borderColor: 'var(--border)',
              }}
            >
              <div className='flex items-center justify-between gap-3 mb-2'>
                <div>
                  <p
                    className='text-[10px] font-semibold uppercase tracking-[0.14em]'
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Live Preview
                  </p>
                  <p
                    className='text-xs font-medium'
                    style={{ color: 'var(--foreground)' }}
                  >
                    {isInjuryTime ? 'Ending soon' : 'In progress'}
                  </p>
                </div>
                <IconButton
                  className='h-9 w-9 rounded-xl border hover:bg-background'
                  style={{
                    color: 'var(--ring)',
                    borderColor: 'var(--border)',
                    background: 'var(--surface-1)',
                  }}
                  icon={<BiFullscreen size={20} className='inline' />}
                  tooltip='Open fullscreen'
                  tooltipPosition='top'
                  onClick={() => onOpenFullScreen(timer)}
                />
              </div>

              <div
                className='rounded-xl px-3 py-2 border'
                style={{
                  background: 'var(--surface-1)',
                  borderColor: 'var(--border)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                }}
              >
                <Watch
                  mode='normal'
                  isInjuryTime={isInjuryTime}
                  hours={localTimer.hours}
                  minutes={localTimer.minutes}
                  seconds={localTimer.seconds}
                  overtime={localTimer.overtime}
                  fullscreen={false}
                />
              </div>
            </div>
          )}

          {isFluidTimer ? (
            <div
              className='rounded-xl border px-3 py-2 text-xs leading-relaxed'
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--muted-foreground)',
              }}
            >
              This event should remain locked. Modifying it would compromise the
              integrity of the ProPresenter screen configuration. It must remain
              locked for the screens to function correctly. DO NOT DELETE.
            </div>
          ) : (
            <div
              className='rounded-2xl border p-4'
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              <div className='flex flex-wrap gap-2'>
                {actionButtons.map((action) => (
                  <IconButton
                    key={action.key}
                    disabled={action.disabled}
                    className='h-9 w-9 rounded-xl border hover:bg-accent hover:text-accent-foreground'
                    style={{
                      color: action.color,
                      borderColor: 'var(--border)',
                      background: 'var(--surface-1)',
                    }}
                    icon={action.icon}
                    tooltip={action.label}
                    tooltipPosition='top'
                    onClick={action.onClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className='text-center py-5 mt-3 rounded-xl border'
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-2)',
          }}
        >
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
