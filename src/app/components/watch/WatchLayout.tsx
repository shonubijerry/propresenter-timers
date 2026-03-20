import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTime } from 'react-timer-hook'
import { formatSecondsToHumanTime, formatTime } from '@/lib/formatter'
import Watch from './Watch'
import { LocalTime, useShared } from '../../providers/timer'

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
  const { broadcastMessage } = useShared()
  const { seconds, minutes, hours, ampm } = useTime({ format: '12-hour' })

  const contentAreaRef = useRef<HTMLDivElement>(null)
  const broadcastTextRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(80)

  const fitText = useCallback(() => {
    const container = contentAreaRef.current
    const text = broadcastTextRef.current
    if (!container || !text) return

    // Available height minus ~90px for the Dismiss button
    const availH = container.clientHeight - 90
    // Pin the element's width so scrollHeight reflects real wrapping behaviour
    const availW = container.clientWidth - 80
    text.style.width = `${availW}px`

    let lo = 12
    let hi = 800
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      text.style.fontSize = `${mid}px`
      // Only height constrains a wrapping block of known width
      if (text.scrollHeight <= availH) lo = mid
      else hi = mid
    }

    text.style.width = '' // restore — React controls width via className
    setFontSize(lo)
  }, [])

  useEffect(() => {
    if (!broadcastMessage) return
    const container = contentAreaRef.current
    if (!container) return
    const ro = new ResizeObserver(fitText)
    ro.observe(container)
    fitText()
    return () => ro.disconnect()
  }, [broadcastMessage, fitText])

  if (!fullscreen) return

  const timeupStyle =
    timeTracker === 'Time Up'
      ? 'text-red-600 animate-[blink_2s_infinite]'
      : isInjuryTime
        ? 'animate-[blink_6s_infinite]'
        : ''

  return (
    <div
      className='h-screen w-screen flex flex-col gap-[1.2vw] p-[1.2vw] overflow-hidden'
      style={{ background: '#f0f0eb' }}
    >
      {/* Header card */}
      <div className='flex items-center justify-between px-[2vw] py-[1vw] shrink-0 rounded-2xl bg-white shadow-sm'>
        {/* Logo (left) */}
        <div className='flex items-center'>
          <Image
            src={logoSvg}
            alt='Logo'
            style={{ height: '4vw', width: 'auto' }}
          />
        </div>

        {/* Time tracker label (center) */}
        {!broadcastMessage && (
          <div
            className={`text-[6vw] font-bold text-gray-800 text-center flex-1 px-4 ${timeupStyle}`}
          >
            {timeTracker}
          </div>
        )}

        {/* Clock (right) */}
        <div className='text-[2.5vw] font-semibold text-gray-800 whitespace-nowrap'>
          {formatTime(hours, minutes, seconds)} {ampm?.toUpperCase()}
        </div>
      </div>

      {/* Main content — off-white container matching outer background */}
      <div
        ref={contentAreaRef}
        className='flex flex-1 flex-col items-center justify-center gap-[1.2vw] overflow-hidden rounded-2xl'
        style={{ background: '#f0f0eb' }}
      >
        {broadcastMessage ? (
          <>
            <div
              ref={broadcastTextRef}
              className='font-extrabold leading-tight text-gray-800 break-words w-full px-[4vw]'
              style={{ fontSize }}
            >
              {broadcastMessage}
            </div>
          </>
        ) : (
          <>
            {/* Watch card */}
            <div className='flex flex-1 items-center justify-center w-full rounded-2xl bg-white shadow-sm'>
              <Watch
                fullscreen={true}
                isInjuryTime={isInjuryTime}
                mode='fullscreen'
                hours={localTimer.hours}
                minutes={localTimer.minutes}
                seconds={localTimer.seconds}
                overtime={localTimer.overtime}
              />
            </div>

            {/* Info card */}
            <div className='w-full rounded-2xl bg-white shadow-sm px-[3vw] py-[1.5vw] text-center shrink-0'>
              <div className='text-[3.5vw] font-bold text-gray-900 leading-tight'>
                {description}
              </div>
              <div className='text-[2.2vw] font-semibold text-gray-700 mt-[0.5vw]'>
                <span className='text-slate-500'>Duration: </span>
                <span>{formatSecondsToHumanTime(duration)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
