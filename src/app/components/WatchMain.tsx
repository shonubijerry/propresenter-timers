import WatchLayoutWithProps from './WatchLayout'
import React from 'react'
import { Timer } from '../interfaces/time'
import { LocalTime } from '../providers/timer'

export default function WatchMain({
  localTimer,
  currentTimer,
}: {
  localTimer: LocalTime
  currentTimer: Timer | null
}) {
  return (
    <WatchLayoutWithProps
      localTimer={localTimer}
      fullscreen={true}
      duration={currentTimer?.countdown?.duration ?? 0}
      description={currentTimer?.id.name}
      timeTracker={localTimer.overtime.isRunning ? 'Time Up' : 'Time Left'}
      isInjuryTime={
        localTimer.totalSeconds < (currentTimer?.countdown?.duration ?? 0) * 0.2
      }
    />
  )
}
