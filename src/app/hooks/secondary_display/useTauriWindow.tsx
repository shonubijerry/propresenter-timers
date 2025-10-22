'use client'

import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { currentMonitor, availableMonitors } from '@tauri-apps/api/window'
import toast from 'react-simple-toasts'

export default function useTauriWindow() {
  const openNewTauriWindow = async () => {
    try {
      const monitors = await availableMonitors()
      const current = await currentMonitor()

      const secondaryMonitor = monitors.find(
        (monitor) => monitor.name !== current?.name
      )

      if (!secondaryMonitor) {
        toast('No secondary display found.')
        return
      }

      const { position, size } = secondaryMonitor

      const webview = new WebviewWindow('secondScreen', {
        url: '?showTime=true',
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

      webview.once('tauri://created', () => {
        console.log('Second screen window created')
      })

      webview.once('tauri://error', (e) => {
        toast(
          `Failed to create window: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`
        )
      })

      await webview.setFocus()
    } catch (error) {
      toast(
        `Could not open a new window: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    }
  }

  return {
    openNewTauriWindow,
  }
}
