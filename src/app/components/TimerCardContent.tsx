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
              <button
                className='cursor-pointer bg-slate-500 hover:bg-slate-700 rounded-r-xl transition-colors duration-200 flex-1 min-w-0 flex items-center justify-items-center has-tooltip'
                onClick={() => onOpenFullScreen(timer)}
              >
                <span className='tooltip tooltip-top'>Open fullscreen</span>
                <BiFullscreen size={40} />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-8 flex-wrap'>
            <button
              disabled={localTimer.isRunning || localTimer.overtime.isRunning}
              className='cursor-pointer duration-200 disabled:text-slate-400 text-green-600 hover:text-green-800 disabled:hover:-translate-y-0 has-tooltip'
            >
              <span className='tooltip tooltip-top'>Start</span>
              <IoPlayOutline
                size={30}
                onClick={() => onOperation(timer, 'start')}
              />
            </button>
            <button
              disabled={
                (localTimer.isRunning || localTimer.overtime.isRunning) &&
                !isActive
              }
              className='cursor-pointer duration-200 disabled:text-slate-400 text-amber-600 hover:text-amber-800 disabled:hover:-translate-y-0 has-tooltip'
            >
              <span className='tooltip tooltip-top'>Stop</span>
              <IoStopOutline
                size={30}
                onClick={() => onOperation(timer, 'stop')}
              />
            </button>
            <button
              disabled={
                (localTimer.isRunning || localTimer.overtime.isRunning) &&
                !isActive
              }
              className='cursor-pointer duration-200 disabled:text-slate-400 text-blue-600 hover:text-blue-800 disabled:hover:-translate-y-0 has-tooltip'
            >
              <span className='tooltip tooltip-top'>Reset</span>
              <LuTimerReset
                size={30}
                onClick={() => onOperation(timer, 'reset')}
              />
            </button>
            <button
              disabled={
                (localTimer.isRunning || localTimer.overtime.isRunning) &&
                isActive
              }
              className='cursor-pointer duration-200 disabled:text-slate-400 text-blue-600 hover:text-blue-800 disabled:hover:-translate-y-0 has-tooltip'
            >
              <span className='tooltip tooltip-top'>Edit</span>
              <AiOutlineEdit size={30} onClick={() => onEdit(timer)} />
            </button>
            <button className='cursor-pointer text-red-600 duration-200 hover:text-red-800 has-tooltip'>
              <span className='tooltip tooltip-top'>Delete</span>
              <MdOutlineDelete
                size={30}
                onClick={() => onDelete(timer.id.uuid)}
              />
            </button>
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
