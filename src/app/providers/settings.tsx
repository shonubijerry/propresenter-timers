'use client'

import Image from 'next/image'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import logoSvg from '../../../public/logo.svg'
import { appDataDir, BaseDirectory } from '@tauri-apps/api/path'
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import { checkUpdate } from '@/lib/update'
import { toastError, toastInfo } from '@/lib/toastUtils'
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
  datastore: 'proPresenter' as const
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  async function getProdSettings(): Promise<AppSettings | undefined> {
    if (typeof window !== 'undefined' && window.isTauri) {
      if (window.__TAURI_INTERNALS__.metadata.currentWebview.label === 'main') {
        await checkUpdate()
      }

      try {
        const appDirExists = await exists('', {
          baseDir: BaseDirectory.AppLocalData,
        })

        if (!appDirExists) {
          await mkdir(await appDataDir())
        }

        const fileExists = await exists('settings.json', {
          baseDir: BaseDirectory.AppLocalData,
        })

        if (!fileExists) {
          await writeTextFile(
            'settings.json',
            JSON.stringify(defaultSettings, null, 2),
            { baseDir: BaseDirectory.AppLocalData }
          )
        } else {
          const data = await readTextFile('settings.json', {
            baseDir: BaseDirectory.AppLocalData,
          })
          return JSON.parse(data) as AppSettings
        }
      } catch (err) {
        console.error(
          'Failed to read Tauri settings:',
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        )
        toastInfo('Tauri => Default settings being used')
      }
    }

    const savedSettings = localStorage.getItem('app-settings')
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings) as AppSettings
        if (parsedSettings.address && parsedSettings.port) {
          return parsedSettings
        }
      } catch (err) {
        console.error(
          'Failed to parse local settings:',
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        )
        toastInfo('Local => Default settings being used')
      }
    }

    return defaultSettings
  }

  useEffect(() => {
    setIsLoading(true)
    getProdSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
      setIsLoading(false)
    })
  }, [])

  // useEffect(() => {
  //   if (!window.isTauri) return

  //   invoke('create_timer', {
  //     timer: {
  //       uuid: '123e4567-e89b-12d3-a456-426614174000',
  //       index_num: 1,
  //       name: 'My Timer',
  //       allows_overrun: false,
  //       countdown_duration: 300.0,
  //       state: 'stopped',
  //       remaining_seconds: 300.0,
  //       started_at: null,
  //       created_at: Date.now(),
  //       updated_at: Date.now(),
  //     },
  //   })
  //   invoke('list_timers').then(console.log)
  // }, [])

  async function updateSettings(newSettings: AppSettings): Promise<void> {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    try {
      if (window.isTauri) {
        try {
          await writeTextFile(
            'settings.json',
            JSON.stringify(updatedSettings, null, 2),
            { baseDir: BaseDirectory.AppLocalData }
          )
          return
        } catch (err) {
          toastError(
            `Failed to save Tauri settings: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
          )
        }
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
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
