import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { Settings } from './lib/settings'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Settings) =>
    ipcRenderer.invoke('save-settings', settings),
  onSettingsUpdate: (callback: (settings: IpcRendererEvent) => void) => {
    ipcRenderer.on('settings-updated', (_event, settings) => callback(settings))
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('settings-updated', callback)
    }
  },
})
