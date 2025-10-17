'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import { Timer } from '../interfaces/time'
import { TimerActions } from '../hooks/timer'
import Watch from './Watch'
import { IoPlayOutline, IoStopOutline } from 'react-icons/io5'
import { LuTimerReset } from 'react-icons/lu'
import { AiOutlineEdit } from 'react-icons/ai'
import { MdOutlineDelete } from 'react-icons/md'
import { LocalTime } from '../providers/timer'
import { BiFullscreen } from 'react-icons/bi'
import IconButton from './ui/IconButton'

interface TimerCardProps {
  timer: Timer
  isActive: boolean
  localTimer: LocalTime
  onOperation: (timer: Timer, action: TimerActions) => void
  onDelete: (uuid: string) => void
  onOpenFullScreen: (timer: Timer) => void
  onEdit: (timer: Timer) => void
}

export function TimerCard({
  timer,
  isActive,
  localTimer,
  onDelete,
  onOperation,
  onOpenFullScreen,
  onEdit,
}: TimerCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-sm border transition-all duration-300 hover:shadow-lg ${
        isActive
          ? 'border-blue-300 bg-gradient-to-br from-blue-50/50 to-white shadow-lg shadow-blue-100/50'
          : 'border-slate-200/50 hover:border-slate-300/50'
      }`}
    >
      {/* Timer Header */}
      <div className='flex items-start justify-between mb-4'>
        <div className='flex-1'>
          <h2 className='text-lg font-semibold text-slate-900 mb-1'>
            {timer.id.name}
          </h2>
          {timer.countdown && (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-slate-500'>Duration:</span>
              <span className='text-sm font-mono bg-slate-100 px-2 py-1 rounded-lg text-slate-800'>
                {formatSecondsToTime(timer.countdown.duration)}
              </span>
            </div>
          )}
        </div>
        {isActive && (
          <div className='flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium'>
            <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
            Active
          </div>
        )}
      </div>

      {timer.countdown ? (
        <div className='space-y-4'>
          {isActive && (
            <div className='flex items-stretch'>
              <div className='flex-3 bg-gradient-to-br from-slate-100 to-slate-300/50 rounded-l-xl p-2 border border-slate-200/50'>
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
                className='cursor-pointer bg-slate-500 hover:bg-slate-700 rounded-r-xl rounded-l-none transition-colors duration-200 flex-1 min-w-0 flex items-center justify-items-center has-tooltip'
                variant='ghost'
                icon={<BiFullscreen size={40} />}
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
              variant='success'
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
              variant='warning'
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
              variant='primary'
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
              variant='primary'
              icon={<AiOutlineEdit size={30} />}
              tooltip='Edit'
              tooltipPosition='top'
              onClick={() => onEdit(timer)}
            />
            <IconButton
              variant='error'
              icon={<MdOutlineDelete size={30} />}
              tooltip='Delete'
              tooltipPosition='top'
              onClick={() => onDelete(timer.id.uuid)}
            />
          </div>
        </div>
      ) : (
        <div className='text-center py-6'>
          <p className='text-sm text-slate-500 font-medium'>
            Timer Config Not Supported
          </p>
        </div>
      )}
    </div>
  )
}
