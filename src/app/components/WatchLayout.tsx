import Image from 'next/image'
import logoSvg from '../../../public/logo.svg'
import { useTime } from 'react-timer-hook'
import { formatSecondsToTime, formatTime } from '@/lib/formatter'
import Watch from './Watch'
import { LocalTime } from '../providers/timer'

export default function WatchLayoutWithProps({
  isInjuryTime,
  localTimer,
  duration,
  fullscreen,
  timeTracker = 'Time Left',
  description = '',
}: {
  isInjuryTime: boolean
  localTimer: LocalTime
  duration: number
  fullscreen?: boolean
  timeTracker?: string
  description?: string
}) {
  const { seconds, minutes, hours, ampm } = useTime({ format: '12-hour' })

  if (!fullscreen) return

  const timeupStyle =
    timeTracker === 'Time Up'
      ? 'text-red-600 animate-[blink_2s_infinite]'
      : isInjuryTime
        ? 'animate-[blink_6s_infinite]'
        : ''

  return (
    <div className='h-screen w-screen bg-white flex flex-col'>
      <div className='absolute top-6 left-0 w-full flex items-center justify-between px-5'>
        {/* Logo (left) */}
        <div className='flex items-center gap-3 cursor-pointer w-50 h-30'>
          <Image src={logoSvg} alt='Logo' />
        </div>

        {/* Time tracker label (center) */}
        <div
          className={`text-9xl font-bold text-gray-800 text-center flex-1 ${timeupStyle}`}
        >
          {timeTracker}
        </div>

        {/* Time (right) */}
        <div className='flex justify-end text-5xl font-semibold text-gray-800 text-top'>
          {formatTime(hours, minutes, seconds)} {ampm?.toUpperCase()}
        </div>
      </div>

      {/* Centered content */}
      <div className='flex flex-1 flex-col items-center justify-center p-5 text-center'>
        <Watch
          fullscreen={true}
          isInjuryTime={isInjuryTime}
          mode='fullscreen'
          hours={localTimer.hours}
          minutes={localTimer.minutes}
          seconds={localTimer.seconds}
          overtime={localTimer.overtime}
        />

        <div className='w-screen text-8xl font-bold text-gray-600 p-5'>
          {description}
        </div>

        <div className='text-5xl font-bold text-gray-600 mt-5'>
          <span className='text-slate-500'>Event Duration:</span>
          <span className='font-mono bg-slate-100 px-2 py-1 rounded-lg'>
            {formatSecondsToTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
