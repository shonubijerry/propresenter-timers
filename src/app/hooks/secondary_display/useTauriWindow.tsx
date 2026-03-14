'use client'

import { toastError, toastInfo } from '@/lib/toastUtils'
import {
  getAllWebviewWindows,
  WebviewWindow,
} from '@tauri-apps/api/webviewWindow'
import { currentMonitor, availableMonitors } from '@tauri-apps/api/window'
import { info, error as logError } from '@tauri-apps/plugin-log'

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
        (monitor) =>
          monitor.position.x !== current?.position.x ||
          monitor.position.y !== current?.position.y
      )

      if (!secondaryMonitor) {
        toastInfo('No secondary display found.')
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

      webview.once('tauri://created', async () => {
        console.log('Second screen window created')
        await info('Second screen window created successfully')
        toastInfo('External screen opened')
      })

      webview.once('tauri://error', async (e) => {
        const errorMsg = JSON.stringify(e, Object.getOwnPropertyNames(e))
        await logError(`Failed to create window: ${errorMsg}`)
        toastError(`Failed to create window: ${errorMsg}`)
      })
    } catch (error) {
      const errorMsg = JSON.stringify(error, Object.getOwnPropertyNames(error))
      await logError(`Could not open a new window: ${errorMsg}`)
      toastError(`Could not open a new window: ${errorMsg}`)
    }
  }

  return {
    openNewTauriWindow,
    closeTauriWindow,
  }
}
