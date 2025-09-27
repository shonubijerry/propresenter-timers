'use client'

import { convertTimeToSeconds, formatSecondsToTime } from '@/lib/formatter'
import { use, useEffect, useState } from 'react'
import { Timer } from './interfaces/time'
import { TimerActions } from './hooks/timer'
import CreateTimerModal from './components/CreateTimerModal'
import { TimerCard } from './components/TimerCardContent'
import { Header } from './components/ui/Header'
import EmptyTimer from './components/EmptyTimer'
import Watch from './components/Watch'
import WatchLayoutWithProps from './components/WatchLayout'
import EditTimerModal from './components/EditTimerModal'
import { useShared } from './providers'
import useSecondScreenDisplay from './hooks/SecondaryScreenDisplay'
import { deleteTimerApi, fetchTimersApi, setTimerOperationApi } from './hooks/proPresenterApi'

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ showTime?: string }>
}) {
  const [isCreateTimerModalOpen, setIsCreateTimerModalOpen] = useState(false)
  const [isEditTimerModalOpen, setIsEditTimerModalOpen] = useState(false)
  const [timerToEdit, setTimerToEdit] = useState<Timer | null>(null)
  const [timers, setTimers] = useState<Timer[]>([])
  const { currentTimer, setCurrentTimer, localTimer, handle } = useShared()
  const { openNewWindow } = useSecondScreenDisplay()
  const params = use(searchParams)
  const [fsWindow, setFsWindow] = useState<Window | null | undefined>(null)

  const updateTimers = (timer: Timer) => {
    const rest = timers.filter(t => t.id.uuid !== timer.id.uuid)
    setTimers([
      ...rest,
      {
        ...timer,
        state: 'stopped',
        remainingSeconds: timer.countdown?.duration ?? 0,
        time: formatSecondsToTime(timer.countdown?.duration ?? 0),
      },
    ])
  }

  const fetchTimers = async () => {
    const data = await fetchTimersApi()

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
      const runningTimer = fetched.find((d) =>
        ['running', 'overrunning'].includes(d.state)
      )

      if (runningTimer && runningTimer.state === 'running') {
        setCurrentTimer(runningTimer)
        localTimer.handleLocalTimer('start', runningTimer.remainingSeconds)
      } else if (runningTimer && runningTimer.state === 'overrunning') {
        setCurrentTimer(runningTimer)
        const timestamp = new Date().valueOf()
        localTimer.overtime.reset(
          new Date(timestamp + (runningTimer.remainingSeconds ?? 0) * 1000),
          true
        )
      }
    }

    loadTimers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (uuid: string) => {
    await deleteTimerApi(uuid)
    setTimers((prev) => prev.filter((t) => t.id.uuid !== uuid))

    if (currentTimer?.id.uuid === uuid) {
      setCurrentTimer(null)
      localTimer.handleLocalTimer('stop')
    }
  }

  const handleOperation = async (timer: Timer, action: TimerActions) => {
    localTimer.overtime.reset(undefined, false)
    if (localTimer.isRunning && action === 'start') {
      return
    }

    if (!localTimer.isRunning && action === 'stop') {
      return
    }
    setCurrentTimer(timer)

    if (action === 'reset') {
      setCurrentTimer(null)
    }

    await setTimerOperationApi(timer.id.uuid)
    localTimer.handleLocalTimer(action, timer.remainingSeconds)
    await fetchTimers()
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-100/70'>
      {!Boolean(params.showTime) ? (
        <>
          <Header setIsModalOpen={setIsCreateTimerModalOpen} />
          <div className='max-w-6xl mx-auto px-6 py-8'>
            {timers.length === 0 ? (
              <EmptyTimer setIsModalOpen={setIsCreateTimerModalOpen} />
            ) : (
              /* Timer Grid */
              <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
                {timers.map((timer) => (
                  <TimerCard
                    key={timer.id.uuid}
                    timer={timer}
                    isActive={currentTimer?.id?.uuid === timer.id.uuid}
                    isRunning={localTimer.isRunning}
                    hours={localTimer.hours}
                    minutes={localTimer.minutes}
                    seconds={localTimer.seconds}
                    overtime={localTimer.overtime}
                    onOperation={handleOperation}
                    onDelete={handleDelete}
                    onOpenFullScreen={async () => {
                      await openNewWindow({
                        fsWindow,
                        setFsWindow,
                        componentToDisplay: (
                          <iframe
                            src='http://localhost:3000?showTime=true'
                            width='100%'
                            height='100%'
                            allow='window-management'
                          ></iframe>
                        ),
                      })
                    }}
                    onEdit={() => {
                      setTimerToEdit(timer)
                      setIsEditTimerModalOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <CreateTimerModal
            open={isCreateTimerModalOpen}
            onClose={() => setIsCreateTimerModalOpen(false)}
            onCreated={updateTimers}
          />

          <EditTimerModal
            timer={timerToEdit}
            open={isEditTimerModalOpen}
            onClose={() => {
              setTimerToEdit(null)
              setIsEditTimerModalOpen(false)
            }}
            onUpdated={updateTimers}
          />
        </>
      ) : (
        <WatchLayoutWithProps
          fullscreen={true}
          title={formatSecondsToTime(currentTimer?.countdown?.duration ?? 0)}
          description={currentTimer?.id.name}
          onExit={handle.exit}
          timeTracker={localTimer.overtime.isRunning ? 'Time Up' : 'Time Left'}
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
      )}
    </main>
  )
}
