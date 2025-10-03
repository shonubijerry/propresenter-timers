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

export interface AppSettings {
  address: string
  port: number
}

// Settings Context
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

// Settings Provider
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [proPresenterUrl, setProPresenterUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from Electron on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Wait for Electron API to be available
      if (typeof window === 'undefined') {
        setIsLoading(false)
        return
      }

      try {
        console.log('Loading settings from Electron...')
        const loadedSettings =
          process.env.NODE_ENV === 'development'
            ? { address: 'http://127.0.0.1', port: 58380 }
            : await window.electron?.getSettings()

        setSettings(loadedSettings)

        if (loadedSettings?.address && loadedSettings?.port) {
          setProPresenterUrl(`${loadedSettings.address}:${loadedSettings.port}`)
        }

        // Listen for settings updates from Electron
        const cleanup = window.electron?.onSettingsUpdate((updatedSettings) => {
          console.log('Settings updated from Electron:', updatedSettings)
          setSettings(updatedSettings)
          if (updatedSettings?.address && updatedSettings?.port) {
            setProPresenterUrl(
              `${updatedSettings.address}:${updatedSettings.port}`
            )
          }
        })

        setIsLoading(false)

        return cleanup
      } catch (err) {
        console.error('Failed to load electron settings:', err)
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings to Electron
  const updateSettings = async (newSettings: AppSettings) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    if (updatedSettings?.address && updatedSettings?.port) {
      setProPresenterUrl(`${updatedSettings.address}:${updatedSettings.port}`)
    }

    if (typeof window !== 'undefined' && window.electron) {
      try {
        const result = await window.electron.saveSettings(updatedSettings)
        if (!result.success) {
          console.error('Failed to save settings:', result.error)
        }
      } catch (err) {
        console.error('Failed to save electron settings:', err)
      }
    }
  }

  const openSettingsDialog = () => setIsDialogOpen(true)
  const closeSettingsDialog = () => setIsDialogOpen(false)

  // Show loading state until settings are loaded
  if (isLoading) {
    return (
      <div
        style={{
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '1.2rem',
          color: '#666',
        }}
      >
        <div className='flex items-center gap-3'>
          <Image
            priority={true}
            className='w-30 h-15 text-center flex-1'
            src={logoSvg}
            alt='Logo'
          />
          <p className='text-2xl font-bold flex text-centre text-slate-600 mt-1'>
            AGC Timer Control
          </p>
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
