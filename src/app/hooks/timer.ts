import { useCallback, useState } from 'react'
import { useStopwatch, useTimer } from 'react-timer-hook'
import { useStopwatchResultType } from 'react-timer-hook/dist/types/src/useStopwatch'
import { CountdownAnchor, resolveAnchor } from '@/lib/timerLogic'

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
  // Absolute times for the countdown, so screen windows can mirror it
  const [anchor, setAnchor] = useState<CountdownAnchor>({ mode: 'idle' })

  const overtime = useStopwatch({ autoStart: false })
  const { seconds, minutes, hours, isRunning, pause, restart, totalSeconds } =
    useTimer({
      autoStart: false,
      expiryTimestamp: new Date(expiryTimestamp),
      onExpire: () => {
        overtime.start()
        setAnchor((prev) => ({
          mode: 'overtime',
          startedAt: prev.mode === 'running' ? prev.endsAt : Date.now(),
        }))
      },
    })

  const { reset: resetStopwatch } = overtime

  const handleLocalTimer = async (action: TimerActions, duration?: number) => {
    if (action === 'stop') {
      pause()
      setAnchor({ mode: 'paused', remainingSeconds: totalSeconds })
      return
    }

    const endsAt = Date.now() + (duration ?? 0) * 1000
    restart(new Date(endsAt), action === 'start')
    setAnchor(
      action === 'start' ? { mode: 'running', endsAt } : { mode: 'idle' }
    )
  }

  /** Show overtime that began `elapsedSeconds` ago */
  const startOvertime = useCallback(
    (elapsedSeconds: number) => {
      const now = Date.now()
      resetStopwatch(new Date(now + elapsedSeconds * 1000), true)
      setAnchor({ mode: 'overtime', startedAt: now - elapsedSeconds * 1000 })
    },
    [resetStopwatch]
  )

  const clearOvertime = useCallback(() => {
    resetStopwatch(undefined, false)
  }, [resetStopwatch])

  /** Rebuild the countdown from another window's anchor */
  const applyAnchor = useCallback(
    (incoming: CountdownAnchor) => {
      const now = Date.now()
      const next = resolveAnchor(incoming, now)

      switch (next.mode) {
        case 'idle':
          resetStopwatch(undefined, false)
          restart(new Date(now), false)
          break
        case 'running':
          resetStopwatch(undefined, false)
          restart(new Date(next.endsAt), true)
          break
        case 'paused':
          resetStopwatch(undefined, false)
          restart(new Date(now + next.remainingSeconds * 1000), false)
          break
        case 'overtime':
          restart(new Date(now), false)
          resetStopwatch(new Date(now + (now - next.startedAt)), true)
          break
      }

      setAnchor(next)
    },
    [resetStopwatch, restart]
  )

  return {
    totalSeconds,
    seconds,
    minutes,
    hours,
    isRunning,
    handleLocalTimer,
    restart,
    overtime,
    anchor,
    startOvertime,
    clearOvertime,
    applyAnchor,
  }
}
