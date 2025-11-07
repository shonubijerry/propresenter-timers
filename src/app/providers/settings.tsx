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
  create,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import { checkUpdate } from '@/lib/update'
import { toastInfo } from '@/lib/toastUtils'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  address: string
  port: number
  theme: ThemeMode
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
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  async function getProdSettings(): Promise<AppSettings> {
    if (typeof window === 'undefined') return defaultSettings

    try {
      // Try Tauri first
      if (window.isTauri !== undefined) {
        await checkUpdate()
        try {
          const appDirExists = await exists('', {
            baseDir: BaseDirectory.AppData,
          })

          if (!appDirExists) {
            await mkdir(await appDataDir())
          }

          const fileExists = await exists('settings.json', {
            baseDir: BaseDirectory.AppData,
          })

          if (!fileExists) {
            await create('settings.json', {
              baseDir: BaseDirectory.AppLocalData,
            })

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
    } catch (err) {
      console.error(
        'Failed to get settings:',
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      )
      return defaultSettings
    }
  }

  useEffect(() => {
    setIsLoading(true)
    getProdSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
      setIsLoading(false)
    })
  }, [])

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
          console.error('Failed to save Tauri settings:', err)
        }
      }

      localStorage.setItem('app-settings', JSON.stringify(updatedSettings))
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  const openSettingsDialog = () => setIsDialogOpen(true)
  const closeSettingsDialog = () => setIsDialogOpen(false)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen' style={{ background: 'var(--background)' }}>
        <div className='flex items-center gap-3'>
          <Image priority className='w-30 h-15' src={logoSvg} alt='Logo' />
        </div>
      </div>
    )
  }

  const computedProPresenterUrl = settings?.address && settings?.port
    ? `${settings.address}:${settings.port}`
    : null

  return (
    <SettingsContext.Provider
      value={{
        proPresenterUrl: computedProPresenterUrl,
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
