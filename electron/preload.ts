// preload.ts
import { contextBridge, ipcRenderer } from 'electron'

// Settings interface (same as in main)
interface AppSettings {
  ipAddress: string
  port: number
  autoConnect: boolean
  theme: 'light' | 'dark'
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings methods
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings),
  testConnection: (ipAddress: string) => ipcRenderer.invoke('test-connection', ipAddress),

  // Event listeners
  onSettingsLoaded: (callback: (settings: AppSettings) => void) => {
    ipcRenderer.on('settings-loaded', (event, settings) => callback(settings))
  },

  onLoadSettings: (callback: (settings: AppSettings) => void) => {
    ipcRenderer.on('load-settings', (event, settings) => callback(settings))
  },

  onIPAddressChanged: (callback: (data: { oldIP: string, newIP: string }) => void) => {
    ipcRenderer.on('ip-address-changed', (event, data) => callback(data))
  },

  // Cleanup listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: AppSettings) => Promise<{ success: boolean }>
      testConnection: (ipAddress: string) => Promise<{ success: boolean, status?: number, error?: string }>
      onSettingsLoaded: (callback: (settings: AppSettings) => void) => void
      onLoadSettings: (callback: (settings: AppSettings) => void) => void
      onIPAddressChanged: (callback: (data: { oldIP: string, newIP: string }) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}
