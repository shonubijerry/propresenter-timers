'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import Watch from './../components/Watch'
import WatchLayoutWithProps from './../components/WatchLayout'
import { useShared } from '../providers'

export default function Page() {
  const { currentTimer, localTimer, handle } = useShared()
  console.log('fullscreen', currentTimer, localTimer);

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100/70'>
      <WatchLayoutWithProps
          fullscreen={true}
          title={`${currentTimer?.id.name} - ${formatSecondsToTime(currentTimer?.countdown?.duration ?? 0)}`}
          onExit={handle.exit}
        >
          <Watch
            fullscreen={true}
            mode='fullscreen'
            hours={localTimer.hours}
            minutes={localTimer.minutes}
            seconds={localTimer.seconds}
            overtime={localTimer.overtime}
          />
        </WatchLayoutWithProps>
    </main>
  )
}
