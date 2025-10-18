'use client'

import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { useShared } from '../providers/timer'

export default function useSecondScreenDisplay() {
  const [componentToDisplay, setComponentToDisplay] = useState<ReactNode>()
  const { fullscreenWindow, setFullscreenWindow } = useShared()

  useEffect(() => {
    if (!fullscreenWindow || !componentToDisplay) return

    fullscreenWindow.document.body.style.margin = '0'
    fullscreenWindow.document.body.innerHTML =
      '<div id="root-second-screen"></div>'

    const node = fullscreenWindow.document.getElementById('root-second-screen')
    if (node) {
      createRoot(node).render(componentToDisplay)
    }
  }, [fullscreenWindow, componentToDisplay])

  const openNewWindow = async (
    componentToDisplay: React.ReactNode,
    setError: Dispatch<SetStateAction<string | null>>
  ) => {
    setComponentToDisplay(componentToDisplay)
    try {
      if ('getScreenDetails' in window) {
        const screenDetails: ScreenDetails = await window.getScreenDetails!()

        console.log(screenDetails)

        const secondaryScreen = screenDetails.screens.find(
          (screen) => !screen.isPrimary
        )

        if (secondaryScreen) {
          const windowFeatures = `
            left=${secondaryScreen.availLeft},
            top=${secondaryScreen.availTop},
            width=${secondaryScreen.availWidth},
            height=${secondaryScreen.availHeight},
            popup=true,
            fullscreen=yes
          `

          if (!fullscreenWindow || fullscreenWindow.closed) {
            const fs = window.open('', 'screenWindow', windowFeatures)
            setFullscreenWindow(fs)
          } else {
            fullscreenWindow.focus()
          }
        } else {
          setError('No extended display found or permission denied.')
        }
      } else {
        setError('Window Management API not supported in this browser.')
      }
    } catch (error) {
      setError(
        `Could not open a new window. Check your browser permissions. ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    }
  }

  return {
    openNewWindow,
  }
}
