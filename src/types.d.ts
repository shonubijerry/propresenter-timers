export {}

declare global {

  interface Window {
    isTauri: boolean
    getScreenDetails: () => Promise<ScreenDetails>
    charCode: string
    __TAURI_INTERNALS__: {
      metadata: {
        currentWebview: {
          label: string
        }
      }
    }
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
