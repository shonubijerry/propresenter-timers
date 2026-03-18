'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
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

export type FullScreenWindow = Window | WebviewWindow

const BROADCAST_MESSAGE_KEY = 'agc:broadcast-message'
const BROADCAST_MAX_CHARACTERS = 100

type SharedState<T extends 'browser' | 'tauri'> = {
  currentTimer: Timer | null | undefined
  setCurrentTimer: Dispatch<SetStateAction<Timer | null | undefined>>
  localTimer: LocalTime
  broadcastMessage: string
  setBroadcastMessage: (message: string) => void
  dismissBroadcastMessage: () => void
  fullscreenWindow: T extends 'tauri'
    ? WebviewWindow | null | undefined
    : Window | null | undefined
  setFullscreenWindow: Dispatch<
    SetStateAction<
      T extends 'tauri'
        ? WebviewWindow | null | undefined
        : Window | null | undefined
    >
  >
}

// We make it non-generic at creation, then cast on use
const SharedContext = createContext<SharedState<'browser'> | null>(null)

export function SharedProvider({ children }: { children: ReactNode }) {
  const [currentTimer, setCurrentTimer] = useState<Timer | null>()
  const [broadcastMessage, setBroadcastMessageState] = useState('')
  const localTimer = useTimerHook({
    expiryTimestamp: new Date().valueOf(),
  })
  const [fullscreenWindow, setFullscreenWindow] = useState<
    Window | null | undefined
  >(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedMessage = window.localStorage.getItem(BROADCAST_MESSAGE_KEY) ?? ''
    setBroadcastMessageState(storedMessage)

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== BROADCAST_MESSAGE_KEY) return
      setBroadcastMessageState(event.newValue ?? '')
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setBroadcastMessage = (message: string) => {
    const value = message.trim().slice(0, BROADCAST_MAX_CHARACTERS)
    setBroadcastMessageState(value)

    if (typeof window === 'undefined') return

    if (value) {
      window.localStorage.setItem(BROADCAST_MESSAGE_KEY, value)
      return
    }

    window.localStorage.removeItem(BROADCAST_MESSAGE_KEY)
  }

  const dismissBroadcastMessage = () => {
    setBroadcastMessage('')
  }

  return (
    <SharedContext.Provider
      value={{
        currentTimer,
        setCurrentTimer,
        localTimer,
        broadcastMessage,
        setBroadcastMessage,
        dismissBroadcastMessage,
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
