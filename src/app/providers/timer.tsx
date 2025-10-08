'use client'

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react'
import useTimerHook, { TimerActions, ReactHookTimerType } from '../hooks/timer'
import { Timer } from '../interfaces/time'
import { FullScreenHandle, useFullScreenHandle } from 'react-full-screen'

export type LocalTime = {
  totalSeconds: number
  seconds: number
  minutes: number
  hours: number
  isRunning: boolean
  handleLocalTimer: (action: TimerActions, duration?: number) => Promise<void>
  restart: (newExpiryTimestamp: Date, newAutoStart?: boolean) => void
  overtime: ReactHookTimerType
}

type SharedState = {
  currentTimer?: Timer | null
  setCurrentTimer: Dispatch<SetStateAction<Timer | null | undefined>>
  localTimer: LocalTime
  handle: FullScreenHandle
  fullscreenWindow: Electron.BrowserWindowProxy | null | undefined
  setFullscreenWindow: Dispatch<
    SetStateAction<Electron.BrowserWindowProxy | null | undefined>
  >
}

const SharedContext = createContext<SharedState | null>(null)

export function SharedProvider({ children }: { children: ReactNode }) {
  const [currentTimer, setCurrentTimer] = useState<Timer | null>()
  const localTimer = useTimerHook({
    expiryTimestamp: new Date().valueOf(),
  })
  const [fullscreenWindow, setFullscreenWindow] = useState<
    Electron.BrowserWindowProxy | null | undefined
  >(null)
  const handle = useFullScreenHandle()



  return (
    <SharedContext.Provider
      value={{
        currentTimer,
        setCurrentTimer,
        localTimer,
        handle,
        fullscreenWindow,
        setFullscreenWindow,
      }}
    >
      {children}
    </SharedContext.Provider>
  )
}

export function useShared() {
  const ctx = useContext(SharedContext)
  if (!ctx) throw new Error('useShared must be used inside SharedProvider')
  return ctx
}
