'use client'

import { Dispatch, SetStateAction } from 'react'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor, availableMonitors } from '@tauri-apps/api/window'

export default function useTauriWindow() {
  const openNewTauriWindow = async (
    setError: Dispatch<SetStateAction<string | null>>
  ) => {
    try {
      const monitors = await availableMonitors()
      const current = await currentMonitor()

      console.log('Available monitors:', monitors)
      console.log('Current monitor:', current)

      // Find a secondary monitor (not the current one)
      const secondaryMonitor = monitors.find(
        (monitor) => monitor.name !== current?.name
      )

      if (!secondaryMonitor) {
        setError('No secondary display found.')
        return
      }

      // Calculate window position for secondary monitor
      const { position, size } = secondaryMonitor

      // Create a new Tauri window on the secondary screen
      const webview = new WebviewWindow('secondScreen', {
        url: '?showTime=true', // You'll need to create this route
        title: 'Timer',
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        fullscreen: true,
        decorations: false,
        alwaysOnTop: false,
        skipTaskbar: false,
      })

      // Wait for the window to be ready
      webview.once('tauri://created', () => {
        console.log('Second screen window created')
      })

      webview.once('tauri://error', (e) => {
        setError(`Failed to create window: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`)
      })

      // Optional: Focus the window
      // await webview.setFocus()
    } catch (error) {
      setError(
        `Could not open a new window: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    }
  }

  return {
    openNewTauriWindow,
  }
}
