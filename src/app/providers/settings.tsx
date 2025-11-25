'use client'

import Image from 'next/image'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import logoSvg from '../../../public/logo.svg'
import { checkUpdate } from '@/lib/update'
import { invoke } from '@tauri-apps/api/core'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  address: string
  port: number
  theme: ThemeMode
  datastore: 'proPresenter' | 'localDb'
}

const SettingsContext = createContext<{
  proPresenterUrl: string | null
  settings?: AppSettings
  updateSettings: (newSettings: AppSettings) => Promise<void>
  isDialogOpen: boolean
  openSettingsDialog: () => void
  closeSettingsDialog: () => void
  isLoading: boolean
  fluidTimers: string[]
  refreshFluidTimers: () => Promise<void>
} | null>(null)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

const defaultSettings = {
  address: 'http://192.168.1.103',
  port: 58000,
  theme: 'system' as const,
  datastore: 'proPresenter' as const,
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fluidTimers, setfluidTimers] = useState<string[]>([])

  async function getProdSettings(): Promise<AppSettings | undefined> {
    if (typeof window !== 'undefined' && window.isTauri) {
      if (window.__TAURI_INTERNALS__.metadata.currentWebview.label === 'main') {
        await checkUpdate()
      }

      const data = await invoke<AppSettings>('get_settings')

      if (!data) {
        await invoke('modify_settings', { settings: defaultSettings })
        return defaultSettings
      }

      return data
    }

    const savedSettings = localStorage.getItem('app-settings')
    if (!savedSettings) {
      localStorage.setItem('app-settings', JSON.stringify(defaultSettings))
      return defaultSettings
    }

    return JSON.parse(savedSettings)
  }

  const refreshFluidTimers = useCallback(async () => {
    if (!settings?.datastore) return

    invoke<{ id: string; timer_id: string }[]>('list_fluid_timers', {
      source: settings.datastore,
    }).then((fluids) => setfluidTimers(fluids.map((f) => f.timer_id)))
  }, [settings])

  useEffect(() => {
    setIsLoading(true)
    getProdSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!settings?.datastore) return

    invoke<{ id: string; timer_id: string }[]>('list_fluid_timers', {
      source: settings?.datastore,
    }).then((fluids) => setfluidTimers(fluids.map((f) => f.timer_id)))
  }, [settings?.datastore])

  async function updateSettings(newSettings: AppSettings): Promise<void> {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    try {
      if (window.isTauri) {
        await invoke('modify_settings', { settings: updatedSettings })
        return
      }

      localStorage.setItem('app-settings', JSON.stringify(updatedSettings))
    } catch (err) {
      console.error(
        `Failed to save settings: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
      )
    }
  }

  const openSettingsDialog = () => setIsDialogOpen(true)
  const closeSettingsDialog = () => setIsDialogOpen(false)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='flex items-center gap-3'>
          <Image priority className='w-30 h-15' src={logoSvg} alt='Logo' />
        </div>
      </div>
    )
  }

  return (
    <SettingsContext.Provider
      value={{
        proPresenterUrl:
          settings?.address && settings?.port
            ? `${settings.address}:${settings.port}`
            : null,
        settings,
        updateSettings,
        isDialogOpen,
        openSettingsDialog,
        closeSettingsDialog,
        isLoading,
        fluidTimers,
        refreshFluidTimers,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
