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

export interface AppSettings {
  address: string
  port: number
}

const SettingsContext = createContext<{
  proPresenterUrl: string | null
  settings?: AppSettings
  updateSettings: (newSettings: AppSettings) => void
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

const defaultSettings = { address: 'http://192.168.1.103', port: 58000 }

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [proPresenterUrl, setProPresenterUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 🔹 Fetch settings for either Electron or Tauri
  const getProdSettings = async (): Promise<AppSettings> => {
    if (typeof window === 'undefined') return defaultSettings

    // 🟢 TAURI
    if (window.isTauri !== undefined) {
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
          const file = await create('settings.json', {
            baseDir: BaseDirectory.AppLocalData,
          })
          console.log(await file.stat())

          await writeTextFile(
            'settings.json',
            JSON.stringify(defaultSettings, null, 2),
            { baseDir: BaseDirectory.AppLocalData }
          )
          return defaultSettings
        }

        const data = await readTextFile('settings.json', {
          baseDir: BaseDirectory.AppLocalData,
        })
        return JSON.parse(data) as AppSettings
      } catch (err) {
        console.error(
          'Failed to read Tauri settings:',
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        )
        return defaultSettings
      }
    }

    // 🟠 ELECTRON
    if (window.electron?.getSettings) {
      return window.electron.getSettings()
    }

    // Default fallback
    return defaultSettings
  }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings =
          process.env.NODE_ENV !== 'development'
            ? defaultSettings
            : await getProdSettings()

        setSettings(loadedSettings)
        if (loadedSettings?.address && loadedSettings?.port) {
          setProPresenterUrl(`${loadedSettings.address}:${loadedSettings.port}`)
        }

        // Listen for updates (Electron only)
        const cleanup = window.electron?.onSettingsUpdate?.(
          (updatedSettings) => {
            setSettings(updatedSettings)
            if (updatedSettings?.address && updatedSettings?.port) {
              setProPresenterUrl(
                `${updatedSettings.address}:${updatedSettings.port}`
              )
            }
          }
        )

        setIsLoading(false)
        return cleanup
      } catch (err) {
        console.error('Failed to load settings:', err)
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // 🔹 Save settings for both Electron and Tauri
  const updateSettings = async (newSettings: AppSettings) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    if (updatedSettings?.address && updatedSettings?.port) {
      setProPresenterUrl(`${updatedSettings.address}:${updatedSettings.port}`)
    }

    try {
      if (window.isTauri) {
        await writeTextFile(
          'settings.json',
          JSON.stringify(updatedSettings, null, 2),
          { baseDir: BaseDirectory.AppLocalData }
        )
      } else if (window.electron?.saveSettings) {
        await window.electron.saveSettings(updatedSettings)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  const openSettingsDialog = () => setIsDialogOpen(true)
  const closeSettingsDialog = () => setIsDialogOpen(false)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen bg-white'>
        <div className='flex items-center gap-3'>
          <Image priority className='w-30 h-15' src={logoSvg} alt='Logo' />
        </div>
      </div>
    )
  }

  return (
    <SettingsContext.Provider
      value={{
        proPresenterUrl,
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
