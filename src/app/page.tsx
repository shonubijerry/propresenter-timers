'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import { useEffect, useState } from 'react'
import { Timer } from './interfaces/time'
import useTimerHook, { TimerActions } from './hooks/timer'
import CreateTimerModal from './components/CreateTimerModal'
import { TimerCard } from './components/TimerCardContent'
import { Header } from './components/ui/Header'
import EmptyTimer from './components/EmptyTimer'
import Watch from './components/Watch'
import { FullScreen, useFullScreenHandle } from 'react-full-screen'
import WatchLayoutWithProps from './components/WatchLayout'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const [timers, setTimers] = useState<Timer[]>([])
  const [currentTimer, setCurrentTimer] = useState<Timer | null>()
  const handle = useFullScreenHandle()
  const { seconds, minutes, hours, isRunning, handleLocalTimer, overtime } =
    useTimerHook({
      expiryTimestamp: new Date().valueOf(),
    })

  const updateTimers = (timer: Timer) => {
    setTimers([
      ...timers,
      {
        ...timer,
        state: 'stopped',
        remainingSeconds: timer.countdown?.duration ?? 0,
        time: formatSecondsToTime(timer.countdown?.duration ?? 0),
      },
    ])
  }

  const fetchTimers = async () => {
    const res = await fetch('/api/timers', {
      cache: 'no-store',
    })
    const data = (await res.json()) as Timer[]

    setTimers(data)
    return data
  }

  useEffect(() => {
    fetchTimers()
  }, [])

  useEffect(() => {
    const loadTimers = async () => {
      const fetched = await fetchTimers()

      setTimers(fetched)
      const runningTimer = fetched.find((d) => d.state === 'running')

      if (runningTimer) {
        setCurrentTimer(runningTimer)
        handleLocalTimer('start', runningTimer.remainingSeconds)
      }
    }

    loadTimers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (uuid: string) => {
    await fetch(`/api/timers/${uuid}`, { method: 'DELETE' })
    setTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))

    if (currentTimer?.id.uuid === uuid) {
      setCurrentTimer(null)
      handleLocalTimer('stop')
    }
  }

  const handleOperation = async (timer: Timer, action: TimerActions) => {
    overtime.reset(undefined, false)
    if (isRunning && action === 'start') {
      return
    }

    if (!isRunning && action === 'stop') {
      return
    }
    setCurrentTimer(timer)

    if (action === 'reset') {
      setCurrentTimer(null)
    }

    await fetch(`/api/timers/${timer.id.uuid}/${action}`)
    handleLocalTimer(action, timer.remainingSeconds)
    await fetchTimers()
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100/70'>
      <Header setIsModalOpen={setIsModalOpen} />
      <div className='max-w-6xl mx-auto px-6 py-8'>
        {timers.length === 0 ? (
          <EmptyTimer setIsModalOpen={setIsModalOpen} />
        ) : (
          /* Timer Grid */
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
            {timers.map((timer) => (
              <TimerCard
                key={timer.id.uuid}
                timer={timer}
                isActive={currentTimer?.id?.uuid === timer.id.uuid}
                isRunning={isRunning}
                hours={hours}
                minutes={minutes}
                seconds={seconds}
                overtime={overtime}
                onOperation={handleOperation}
                onDelete={handleDelete}
                omOpenFullScreen={() => {
                  setFullScreen(true)
                  handle.enter()
                }}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTimerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={updateTimers}
      />

      <FullScreen
        handle={handle}
        onChange={(state) => {
          if (!state) setFullScreen(state)
        }}
        className='bg-white'
      >
        <WatchLayoutWithProps
          fullscreen={fullScreen}
          title={`${currentTimer?.id.name} - ${formatSecondsToTime(currentTimer?.countdown?.duration ?? 0)}`}
          onExit={handle.exit}
        >
          <Watch
            fullscreen={fullScreen}
            mode='fullscreen'
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            overtime={overtime}
          />
        </WatchLayoutWithProps>
      </FullScreen>
    </main>
  )
}
