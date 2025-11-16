'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import { Timer } from '../../interfaces/time'
import { TimerActions } from '../../hooks/timer'
import Watch from '../watch/Watch'
import { IoPlayOutline, IoStopOutline } from 'react-icons/io5'
import { LuTimerReset } from 'react-icons/lu'
import { AiOutlineEdit } from 'react-icons/ai'
import { MdOutlineDelete } from 'react-icons/md'
import { LocalTime } from '../../providers/timer'
import { BiFullscreen } from 'react-icons/bi'
import IconButton from '../ui/IconButton'

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
            <IconButton
              disabled={localTimer.isRunning || localTimer.overtime.isRunning}
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
              style={{ color: 'var(--orange)' }}
              icon={<IoStopOutline size={30} />}
              tooltip='Stop'
              tooltipPosition='top'
              onClick={() => onOperation(timer, 'stop')}
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
              disabled={
                (localTimer.isRunning || localTimer.overtime.isRunning) &&
                isActive
              }
              style={{ color: 'var(--ring)' }}
              icon={<AiOutlineEdit size={30} />}
              tooltip='Edit'
              tooltipPosition='top'
              onClick={onEditClick}
            />
            <IconButton
              style={{ color: 'var(--destructive)' }}
              icon={<MdOutlineDelete size={30} />}
              tooltip='Delete'
              tooltipPosition='top'
              onClick={() => onDelete(timer.id.uuid)}
            />
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
    </div>
  )
}
