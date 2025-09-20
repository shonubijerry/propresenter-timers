import { formatTime } from '@/lib/formatter'
import { useStopwatch } from 'react-timer-hook'

interface Props {
  hours: number
  minutes: number
  seconds: number
  overtime: ReturnType<typeof useStopwatch>
  fullscreen?: boolean
  mode?: 'normal' | 'fullscreen'
}

export default function Watch({
  hours,
  minutes,
  seconds,
  overtime,
  fullscreen,
  mode,
}: Props) {
  if (mode === 'fullscreen' && !fullscreen) return

  const textSize = fullscreen
    ? 'h-screen w-screen flex items-center justify-center font-bold text-[20vw] tracking-wider'
    : 'text-2xl'
  return (
    <>
      {overtime.isRunning ? (
        <h2 className={`px-3 py-1 ${textSize} text-red-600`}>
          {formatTime(overtime.hours, overtime.minutes, overtime.seconds)}
        </h2>
      ) : (
        <h2 className={`px-3 py-1  ${textSize} text-green-600`}>
          {formatTime(hours, minutes, seconds)}
        </h2>
      )}
    </>
  )
}
