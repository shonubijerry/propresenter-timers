'use client'

import {
  getAllWebviewWindows,
  WebviewWindow,
} from '@tauri-apps/api/webviewWindow'
import { currentMonitor, availableMonitors } from '@tauri-apps/api/window'
import toast from 'react-simple-toasts'

export default function useTauriWindow() {
  const closeTauriWindow = async (view = 'second-screen') => {
    const windows = await getAllWebviewWindows()
    if (windows.length > 1) {
      await windows.find((w) => w.label === view)?.close()
    }
  }

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

      await closeTauriWindow()

      const { position, size } = secondaryMonitor

      const webview = new WebviewWindow('second-screen', {
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
    } catch (error) {
      toast(
        `Could not open a new window: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    }
  }

  return {
    openNewTauriWindow,
    closeTauriWindow
  }
}
