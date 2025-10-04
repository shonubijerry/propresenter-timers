'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import { Timer } from '../interfaces/time'
import { TimerActions } from '../hooks/timer'
import Watch from './Watch'
import fullScreenSvg from '../../../public/fullscreen.svg'
import Image from 'next/image'
import { IoPlayOutline, IoStopOutline } from 'react-icons/io5'
import { LuTimerReset } from 'react-icons/lu'
import { AiOutlineEdit } from 'react-icons/ai'
import { MdOutlineDelete } from 'react-icons/md'
import { LocalTime } from '../providers/timer'

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
                  isInjuryTime={localTimer.totalSeconds < ((timer?.countdown?.duration ?? 0) * 0.2)}
                  hours={localTimer.hours}
                  minutes={localTimer.minutes}
                  seconds={localTimer.seconds}
                  overtime={localTimer.overtime}
                  fullscreen={false}
                />
              </div>
              <button
                className='cursor-pointer bg-slate-400 hover:bg-slate-500 text-white rounded-r-xl font-medium text-sm transition-colors duration-200 flex-1 min-w-0 flex items-center justify-center'
                onClick={() => onOpenFullScreen(timer)}
              >
                <Image
                  className='w-8 h-8'
                  src={fullScreenSvg}
                  alt='Full Screen'
                />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-2 flex-wrap'>
            <button
              disabled={localTimer.isRunning || localTimer.overtime.isRunning}
              className='flex-1 min-w-0'
            >
              <IoPlayOutline
                size={30}
                onClick={() => onOperation(timer, 'start')}
                className='cursor-pointer text-green-600 duration-200 hover:text-green-800 hover:-translate-y-1'
              />
            </button>
            <button
              disabled={(localTimer.isRunning || localTimer.overtime.isRunning) && !isActive}
              className='flex-1 min-w-0'
            >
              <IoStopOutline
                size={30}
                onClick={() => onOperation(timer, 'stop')}
                className='cursor-pointer text-amber-600 duration-200 hover:text-amber-800 hover:-translate-y-1'
              />
            </button>
            <button disabled={(localTimer.isRunning || localTimer.overtime.isRunning) && !isActive}
              className='flex-1 min-w-0'
            >
              <LuTimerReset
                size={30}
                onClick={() => onOperation(timer, 'reset')}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-800 hover:-translate-y-1'
              />
            </button>
            <button disabled={(localTimer.isRunning || localTimer.overtime.isRunning) && isActive}
              className='flex-1 min-w-0'
            >
              <AiOutlineEdit
                size={30}
                onClick={() => onEdit(timer)}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-800 hover:-translate-y-1'
              />
            </button>
            <button>
              <MdOutlineDelete
                size={30}
                onClick={() => onDelete(timer.id.uuid)}
                className='cursor-pointer text-red-600 duration-200 hover:text-red-800 hover:-translate-y-1'
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
