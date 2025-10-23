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
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

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

export type FullScreenWindow = Electron.BrowserWindowProxy | WebviewWindow

type SharedState<T extends 'browser' | 'tauri'> = {
  currentTimer: Timer | null | undefined
  setCurrentTimer: Dispatch<SetStateAction<Timer | null | undefined>>
  localTimer: LocalTime
  fullscreenWindow: T extends 'tauri'
    ? WebviewWindow | null | undefined
    : Electron.BrowserWindowProxy | null | undefined
  setFullscreenWindow: Dispatch<
    SetStateAction<
      T extends 'tauri'
        ? WebviewWindow | null | undefined
        : Electron.BrowserWindowProxy | null | undefined
    >
  >
}

// We make it non-generic at creation, then cast on use
const SharedContext = createContext<SharedState<'browser'> | null>(null)

export function SharedProvider({ children }: { children: ReactNode }) {
  const [currentTimer, setCurrentTimer] = useState<Timer | null>()
  const localTimer = useTimerHook({
    expiryTimestamp: new Date().valueOf(),
  })
  const [fullscreenWindow, setFullscreenWindow] = useState<
    Electron.BrowserWindowProxy | null | undefined
  >(null)

  return (
    <SharedContext.Provider
      value={{
        currentTimer,
        setCurrentTimer,
        localTimer,
        fullscreenWindow,
        setFullscreenWindow,
      }}
    >
      {children}
    </SharedContext.Provider>
  )
}

export function useShared<T extends 'browser' | 'tauri' = 'browser'>() {
  const ctx = useContext(SharedContext) as SharedState<T> | null
  if (!ctx) throw new Error('useShared must be used inside SharedProvider')
  return ctx
}
