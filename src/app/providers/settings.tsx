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
import {
  AppProfile,
  AppSettings,
  SqliteFluidTimer,
  ThemeMode,
} from '../interfaces/settings'
import {
  buildProfileDbUrl,
  createProfile,
  DEFAULT_PROFILE_ID,
  getBrowserSettingsStorageKey,
  getDefaultProfile,
  persistProfilesState,
  readProfilesState,
} from '@/lib/profile'

type SettingKey = Exclude<keyof AppSettings, 'id'>

interface SqliteSettingRow {
  id: number
  name: SettingKey
  value: string
}

const ensureProfileDatabaseSchema = async (database: Database) => {
  await database.execute(`CREATE TABLE IF NOT EXISTS timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
    name TEXT NOT NULL,
    allows_overrun INTEGER NOT NULL DEFAULT 0,
    countdown_duration REAL,
    state TEXT NOT NULL,
    remaining_seconds REAL NOT NULL,
    started_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`)

  await database.execute(`CREATE TABLE IF NOT EXISTS fluid_timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_id TEXT UNIQUE,
    source TEXT,
    created_at INTEGER NOT NULL
  );`)

  await database.execute(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );`)

  await database.execute(`CREATE TABLE IF NOT EXISTS timer_run_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_uuid TEXT NOT NULL,
    timer_name TEXT NOT NULL,
    scheduled_duration REAL NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    end_action TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`)

  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_timer_run_logs_timer_uuid ON timer_run_logs(timer_uuid);'
  )
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_timer_run_logs_started_at ON timer_run_logs(started_at);'
  )
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_timer_run_logs_ended_at ON timer_run_logs(ended_at);'
  )
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
  profiles: AppProfile[]
  activeProfileId: string
  activeProfile: AppProfile
  createNewProfile: (name: string) => Promise<AppProfile>
  deleteProfile: (profileId: string) => Promise<void>
  switchProfile: (profileId: string) => Promise<void>
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
  const [isProfileReady, setIsProfileReady] = useState(false)
  const [fluidTimers, setfluidTimers] = useState<string[]>([])
  const [db, setDb] = useState<Database>()
  const [profiles, setProfiles] = useState<AppProfile[]>([getDefaultProfile()])
  const [activeProfileId, setActiveProfileId] = useState<string>(
    DEFAULT_PROFILE_ID
  )

  const activeProfile = useMemo(
    () =>
      profiles.find((profile) => profile.id === activeProfileId) ??
      getDefaultProfile(),
    [profiles, activeProfileId]
  )

  // Initialize profile and database first
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const { profiles: storedProfiles, activeProfileId: storedActiveProfileId } =
      readProfilesState()

    setProfiles(storedProfiles)
    setActiveProfileId(storedActiveProfileId)

    if (!window.isTauri) {
      setIsProfileReady(true)
      return
    }

    Database.load(buildProfileDbUrl(storedActiveProfileId))
      .then(async (database) => {
        await ensureProfileDatabaseSchema(database)
        setDb(database)
      })
      .catch((err) => {
        console.error('Failed to load database:', err)
      })
      .finally(() => {
        setIsProfileReady(true)
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
      if (!isProfileReady) return

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
          const browserSettingsKey = getBrowserSettingsStorageKey(activeProfileId)
          const savedSettings = localStorage.getItem(browserSettingsKey)
          if (!savedSettings) {
            localStorage.setItem(browserSettingsKey, JSON.stringify(defaultSettings))
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
  }, [settingsService, isProfileReady, activeProfileId])

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
          localStorage.setItem(
            getBrowserSettingsStorageKey(activeProfileId),
            JSON.stringify(updatedSettings)
          )
        }
      } catch (err) {
        console.error(
          `Failed to save settings: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
        )
      }
    },
    [settings, settingsService, activeProfileId]
  )

  const createNewProfile = useCallback(
    async (name: string): Promise<AppProfile> => {
      const nextProfile = createProfile(name)
      const duplicate = profiles.some(
        (profile) =>
          profile.name.trim().toLowerCase() ===
          nextProfile.name.trim().toLowerCase()
      )

      if (duplicate) {
        throw new Error('A profile with this name already exists')
      }

      const nextProfiles = [...profiles, nextProfile]
      persistProfilesState(nextProfiles, activeProfileId)
      setProfiles(nextProfiles)

      if (typeof window !== 'undefined' && window.isTauri) {
        const database = await Database.load(buildProfileDbUrl(nextProfile.id))
        await ensureProfileDatabaseSchema(database)
      }

      return nextProfile
    },
    [profiles, activeProfileId]
  )

  const deleteProfile = useCallback(
    async (profileId: string): Promise<void> => {
      if (profileId === DEFAULT_PROFILE_ID) {
        throw new Error('Default profile cannot be deleted')
      }

      if (profileId === activeProfileId) {
        throw new Error('Switch to another profile before deleting this one')
      }

      const nextProfiles = profiles.filter((profile) => profile.id !== profileId)
      persistProfilesState(nextProfiles, activeProfileId)
      setProfiles(nextProfiles)

      if (typeof window !== 'undefined' && !window.isTauri) {
        localStorage.removeItem(getBrowserSettingsStorageKey(profileId))
      }
    },
    [profiles, activeProfileId]
  )

  const switchProfile = useCallback(
    async (profileId: string): Promise<void> => {
      const profileExists = profiles.some((profile) => profile.id === profileId)

      if (!profileExists) {
        throw new Error('Profile not found')
      }

      if (profileId === activeProfileId) return

      persistProfilesState(profiles, profileId)
      setActiveProfileId(profileId)

      if (typeof window === 'undefined') return

      window.location.reload()
    },
    [profiles, activeProfileId]
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
        profiles,
        activeProfileId,
        activeProfile,
        createNewProfile,
        deleteProfile,
        switchProfile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
