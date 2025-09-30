'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'

export interface AppSettings {
  address: string
  port: number
}

// Default settings
const defaultSettings = {
  address: '',
  port: 58380,
}

// Settings Context
const SettingsContext = createContext<{
  proPresenterUrl: string | null
  settings?: AppSettings
  updateSettings: (newSettings: AppSettings) => void
  isDialogOpen: boolean
  openSettingsDialog: () => void
  closeSettingsDialog: () => void
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

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = localStorage?.getItem('userSettings')

    const savedSettings = storedSettings
      ? JSON.parse(storedSettings)
      : defaultSettings

    setSettings((prev) => ({ ...prev, ...savedSettings }))
    if (savedSettings?.address && savedSettings?.port)
      setProPresenterUrl(`${savedSettings?.address}:${savedSettings?.port}`)
  }, [])

  // Save settings to localStorage
  const updateSettings = (newSettings: AppSettings) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    if (updatedSettings?.address && updatedSettings?.port)
      setProPresenterUrl(`${updatedSettings?.address}:${updatedSettings?.port}`)
    localStorage?.setItem('userSettings', JSON.stringify(updatedSettings))
  }

  const openSettingsDialog = () => setIsDialogOpen(true)
  const closeSettingsDialog = () => setIsDialogOpen(false)

  return (
    <SettingsContext.Provider
      value={{
        proPresenterUrl,
        settings,
        updateSettings,
        isDialogOpen,
        openSettingsDialog,
        closeSettingsDialog,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
