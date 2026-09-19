import { formatTime } from '@/lib/formatter'
import { useStopwatch } from 'react-timer-hook'

interface Props {
  isInjuryTime: boolean
  hours: number
  minutes: number
  seconds: number
  overtime: ReturnType<typeof useStopwatch>
  fullscreen?: boolean
  mode?: 'normal' | 'fullscreen'
  sizeClassName?: string
  className?: string
}

export default function Watch({
  isInjuryTime,
  hours,
  minutes,
  seconds,
  overtime,
  fullscreen,
  mode,
  sizeClassName,
  className,
}: Props) {
  if (mode === 'fullscreen' && !fullscreen) return

  const textSize =
    sizeClassName ??
    (fullscreen
      ? 'font-bold text-[19vw] tracking-wider'
      : 'text-2xl')

  const textColor = isInjuryTime
    ? 'text-amber-500'
    : 'text-green-600'
  return (
    <>
      {overtime.isRunning ? (
        <h2 className={`px-3 py-1 ${textSize} text-red-600 ${className ?? ''}`}>
          -{formatTime(overtime.hours, overtime.minutes, overtime.seconds)}
        </h2>
      ) : (
        <h2 className={`px-3 py-1 ${textSize} ${textColor} ${className ?? ''}`}>
          {formatTime(hours, minutes, seconds)}
        </h2>
      )}
    </>
  )
}
