import { AppSettings } from "../providers/settings"

export interface IElectronAPI {
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>
  onSettingsUpdate: (callback: (settings: AppSettings) => void) => void
}

declare global {
  interface Window {
    electron: IElectronAPI
  }
}
