export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  address: string
  port: number
  theme: ThemeMode
  datastore: 'proPresenter' | 'localDb'
}

export interface SqliteFluidTimer {
  id: number
  timer_id: string
  source: 'proPresenter' | 'localDb'
  created_at: number
}
