'use client'

import { toastError, toastInfo } from '@/lib/toastUtils'
import {
  getAllWebviewWindows,
  WebviewWindow,
} from '@tauri-apps/api/webviewWindow'
import { currentMonitor, availableMonitors } from '@tauri-apps/api/window'
import { info, error as logError } from '@tauri-apps/plugin-log'

const SECOND_SCREEN_LABEL = 'second-screen'
const FEEDBACK_SCREEN_LABEL = 'feedback-screen'

export default function useTauriWindow() {
  const closeTauriWindow = async (
    view: string | string[] = [SECOND_SCREEN_LABEL, FEEDBACK_SCREEN_LABEL]
  ) => {
    const labels = Array.isArray(view) ? view : [view]
    const windows = await getAllWebviewWindows()
    if (windows.length > 1 && labels.length) {
      await Promise.all(
        labels.map(async (label) => {
          await windows.find((w) => w.label === label)?.close()
        })
      )
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
      const currentPosition = current?.position ?? position
      const currentSize = current?.size ?? size

      const previewWidth = Math.round(currentSize.width * 0.12)
      const previewHeight = Math.round(currentSize.height * 0.15)
      const previewX = currentPosition.x + 16
      const previewY = currentPosition.y + 16

      const webview = new WebviewWindow(SECOND_SCREEN_LABEL, {
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

      new WebviewWindow(FEEDBACK_SCREEN_LABEL, {
        url: '?showTime=true',
        title: 'Timer Preview',
        x: previewX,
        y: previewY,
        width: Math.round(previewWidth),
        height: Math.round(previewHeight),
        fullscreen: false,
        decorations: true,
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: true,
      })

      webview.once('tauri://created', async () => {
        console.log('Second screen window created')
        await info('Second screen window created successfully')
        toastInfo('External screen and preview opened')
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
