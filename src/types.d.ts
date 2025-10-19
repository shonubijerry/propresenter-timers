import { AppSettings } from './app/providers/settings'

declare global {
  namespace Electron {
    interface BrowserWindowProxy extends Window {
      document: Document
      // location: Location
      // navigator: Navigator
    }
  }

  interface Window {
    isTauri: true
    electron?: IElectronAPI
    getScreenDetails: () => Promise<ScreenDetails>
    charCode: string
  }

  interface IElectronAPI {
    getSettings: () => Promise<AppSettings>
    saveSettings: (
      settings: AppSettings
    ) => Promise<{ success: boolean; error?: string }>
    onSettingsUpdate: (callback: (settings: AppSettings) => void) => void
  }

  interface ScreenDetails {
    screens: ScreenDetailed[]
    currentScreen: ScreenDetailed
  }

  interface ScreenDetailed {
    availHeight: number
    availLeft: number
    availTop: number
    availWidth: number
    colorDepth: number
    devicePixelRatio: number
    height: number
    isExtended: boolean
    isInternal: boolean
    isPrimary: boolean
    label: string
    left: number
    orientation: {
      angle: number
      type: string
    }
    pixelDepth: number
    top: number
    width: number
  }
}
