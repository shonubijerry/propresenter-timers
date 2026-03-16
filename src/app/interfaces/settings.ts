export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  id?: number
  address: string
  port: number
  theme: ThemeMode
  datastore: 'proPresenter' | 'localDb'
  lock_password: string
}

export interface SqliteFluidTimer {
  id: number
  timer_id: string
  source: 'proPresenter' | 'localDb'
  created_at: number
}
