'use client'

import { Dispatch, SetStateAction, useState, useEffect } from 'react'
import useBrowserWindow from './useBrowserWindow'
import useTauriWindow from './useTauriWindow'

export default function useSecondScreenDisplay() {
  const { openNewTauriWindow } = useTauriWindow()
  const { openNewBrowserWindow } = useBrowserWindow()
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    setIsTauri(typeof window !== 'undefined' && window.isTauri)
  }, [])

  const openNewWindow = async (
    setError: Dispatch<SetStateAction<string | null>>
  ) => {
    if (isTauri) {
      await openNewTauriWindow(setError)
    } else {
      await openNewBrowserWindow(setError)
    }
  }

  return {
    openNewWindow,
  }
}
