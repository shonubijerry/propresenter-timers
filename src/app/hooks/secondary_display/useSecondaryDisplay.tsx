'use client'

import { useState, useEffect } from 'react'
import useBrowserWindow from './useBrowserWindow'
import useTauriWindow from './useTauriWindow'

export default function useSecondScreenDisplay() {
  const { openNewTauriWindow, closeTauriWindow } = useTauriWindow()
  const { openNewBrowserWindow } = useBrowserWindow()
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    setIsTauri(typeof window !== 'undefined' && window.isTauri)
  }, [])

  const openNewWindow = async () => {
    if (isTauri) {
      await openNewTauriWindow()
    } else {
      await openNewBrowserWindow()
    }
  }

  return {
    openNewWindow,
    closeTauriWindow,
  }
}
