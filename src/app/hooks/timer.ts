import { useStopwatch, useTimer } from 'react-timer-hook'
import { useStopwatchResultType } from 'react-timer-hook/dist/types/src/useStopwatch'

interface Props {
  expiryTimestamp: number
}

type TimerActionsMap = {
  start: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void
  stop: () => void
  reset: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void
}

export type TimerActions = keyof TimerActionsMap

export type ReactHookTimerType = useStopwatchResultType

export default function useTimerHook({ expiryTimestamp }: Props) {
  const overtime = useStopwatch({ autoStart: false })
  const { seconds, minutes, hours, isRunning, pause, restart, totalSeconds } =
    useTimer({
      autoStart: false,
      expiryTimestamp: new Date(expiryTimestamp),
      onExpire: () => {
        overtime.start()
      },
    })

  const handleLocalTimer = async (action: TimerActions, duration?: number) => {
    if (action === 'stop') {
      pause()
      return
    }

    const timestamp = new Date().valueOf()

    restart(new Date(timestamp + (duration ?? 0) * 1000), action === 'start')
  }

  return {
    totalSeconds,
    seconds,
    minutes,
    hours,
    isRunning,
    handleLocalTimer,
    restart,
    overtime,
  }
}
