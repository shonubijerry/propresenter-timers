'use client'

import Image from 'next/image'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react'
import logoSvg from '../../../public/logo.svg'
import { checkUpdate } from '@/lib/update'
import { toastWarning } from '@/lib/toastUtils'
import { DbService } from '@/lib/database'
import Database from '@tauri-apps/plugin-sql'
import { AppSettings, SqliteFluidTimer, ThemeMode } from '../interfaces/settings'

type SettingKey = Exclude<keyof AppSettings, 'id'>

interface SqliteSettingRow {
  id: number
  name: SettingKey
  value: string
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
  db?: Database
  addFluidTimer: (data: Omit<SqliteFluidTimer, "id">) => Promise<void>
  removeFluidTimer: (uuid: string) => Promise<void>
} | null>(null)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

const defaultSettings: AppSettings = {
  id: 1,
  address: 'http://192.168.1.103',
  port: 58000,
  theme: 'system',
  datastore: 'proPresenter',
  lock_password: '',
}

const settingKeys: SettingKey[] = [
  'address',
  'port',
  'theme',
  'datastore',
  'lock_password',
]

const themeModes: ThemeMode[] = ['light', 'dark', 'system']
const datastores: AppSettings['datastore'][] = ['proPresenter', 'localDb']

const mapRowsToAppSettings = (rows: SqliteSettingRow[]): AppSettings => {
  const rowMap = rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.name] = row.value
    return acc
  }, {})

  const portValue = Number(rowMap.port)
  const themeValue = rowMap.theme
  const datastoreValue = rowMap.datastore

  return {
    id: 1,
    address: rowMap.address || defaultSettings.address,
    port:
      Number.isFinite(portValue) && portValue > 0 && portValue <= 65535
        ? portValue
        : defaultSettings.port,
    theme: themeModes.includes(themeValue as ThemeMode)
      ? (themeValue as ThemeMode)
      : defaultSettings.theme,
    datastore: datastores.includes(datastoreValue as AppSettings['datastore'])
      ? (datastoreValue as AppSettings['datastore'])
      : defaultSettings.datastore,
    lock_password: rowMap.lock_password ?? defaultSettings.lock_password,
  }
}

const saveSettingsRows = async (
  service: DbService<SqliteSettingRow>,
  appSettings: AppSettings
) => {
  for (const key of settingKeys) {
    await service.upsert({
      name: key,
      value: String(appSettings[key]),
    })
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fluidTimers, setfluidTimers] = useState<string[]>([])
  const [db, setDb] = useState<Database>()

  // Initialize database first
  useEffect(() => {
    if (typeof window === 'undefined' || !window.isTauri) {
      return
    }

    Database.load('sqlite:timersv2.db')
      .then((datab) => setDb(datab))
      .catch((err) => {
        console.error('Failed to load database:', err)
      })
  }, [])

  // Create services only when db is available
  const fluidTimerService = useMemo(() => {
    if (!db) return null
    return new DbService<SqliteFluidTimer>('fluid_timers', 'timer_id', db)
  }, [db])

  const settingsService = useMemo(() => {
    if (!db) return null
    return new DbService<SqliteSettingRow>('settings', 'name', db)
  }, [db])

  // Load settings after services are ready
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)

      try {
        if (typeof window !== 'undefined' && window.isTauri) {
          // Wait for settingsService to be ready
          if (!settingsService) {
            return
          }

          if (
            window.__TAURI_INTERNALS__.metadata.currentWebview.label === 'main'
          ) {
            await checkUpdate()
          }

          const data = await settingsService.findAll('id ASC')
          const mappedSettings = mapRowsToAppSettings(data)

          if (data.length < settingKeys.length) {
            await saveSettingsRows(settingsService, mappedSettings)
          }

          setSettings(mappedSettings)
        } else {
          // Browser mode
          const savedSettings = localStorage.getItem('app-settings')
          if (!savedSettings) {
            localStorage.setItem(
              'app-settings',
              JSON.stringify(defaultSettings)
            )
            setSettings(defaultSettings)
          } else {
            setSettings(JSON.parse(savedSettings))
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        setSettings(defaultSettings)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [settingsService])

  // Load fluid timers when settings change
  useEffect(() => {
    async function loadFluidTimers() {
      if (!settings?.datastore) return

      if (typeof window === 'undefined' || !window.isTauri) {
        toastWarning('Running in browser mode: fluid timers is not available')
        return
      }

      if (!fluidTimerService) return

      try {
        const fluids = await fluidTimerService.findWhere({
          source: settings.datastore,
        })
        setfluidTimers(fluids.map((f) => f.timer_id))
      } catch (err) {
        console.error('Failed to load fluid timers:', err)
      }
    }

    loadFluidTimers()
  }, [settings?.datastore, fluidTimerService])

  const addFluidTimer = useCallback(async (data: Omit<SqliteFluidTimer, 'id'>) => {
    if (!settings?.datastore) return
    if (typeof window === 'undefined' || !window.isTauri) return
    if (!fluidTimerService) return

    try {
      const fluids = await fluidTimerService.create(data)
      setfluidTimers((prev) => [...prev, fluids.timer_id])
    } catch (err) {
      console.error('Failed to refresh fluid timers:', err)
    }
  }, [settings?.datastore, fluidTimerService])

  const removeFluidTimer = useCallback(async (uuid: string) => {
    if (typeof window === 'undefined' || !window.isTauri) return
    if (!fluidTimerService) return

    try {
      await fluidTimerService.deleteWhere({  timer_id: uuid })
      setfluidTimers((prev) => prev.filter((t) => t !== uuid))
    } catch (err) {
      console.error('Failed to refresh fluid timers:', err)
    }
  }, [fluidTimerService])

  const updateSettings = useCallback(
    async (newSettings: AppSettings): Promise<void> => {
      const updatedSettings = {
        ...(settings ?? defaultSettings),
        ...newSettings,
        id: 1,
      }
      setSettings(updatedSettings)

      try {
        if (typeof window !== 'undefined' && window.isTauri) {
          if (settingsService) {
            await saveSettingsRows(settingsService, updatedSettings)
          }
        } else {
          localStorage.setItem('app-settings', JSON.stringify(updatedSettings))
        }
      } catch (err) {
        console.error(
          `Failed to save settings: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
        )
      }
    },
    [settings, settingsService]
  )

  const openSettingsDialog = useCallback(() => setIsDialogOpen(true), [])
  const closeSettingsDialog = useCallback(() => setIsDialogOpen(false), [])

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
        db,
        addFluidTimer,
        removeFluidTimer,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
