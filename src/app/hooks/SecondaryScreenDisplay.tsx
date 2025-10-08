'use client'

import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Prop = {
  componentToDisplay: React.ReactNode
}

export default function useSecondScreenDisplay() {
  const [fullscreenWindow, setFullscreenWindow] = useState<
    Electron.BrowserWindowProxy | null | undefined
  >(null)
  const [componentToDisplay, setComponentToDisplay] = useState<
    React.ReactNode | undefined
  >(null)

  // 👇 Watch for fullscreenWindow changes here
  useEffect(() => {
    if (!fullscreenWindow) return

    // Render your React component into the new window
    displayComponent()

    // Cleanup when the window is closed
    const handleUnload = () => {
      setFullscreenWindow(null)
    }
    fullscreenWindow.addEventListener('beforeunload', handleUnload)

    return () => {
      fullscreenWindow.removeEventListener('beforeunload', handleUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenWindow])

  const displayComponent = () => {
    if (!fullscreenWindow) {
      return
    }

    fullscreenWindow.document.body.style.margin = '0'
    fullscreenWindow.document.body.innerHTML =
      '<div id="root-second-screen"></div>'

    const node = fullscreenWindow.document.getElementById('root-second-screen')
    if (node) {
      createRoot(node).render(componentToDisplay)
    }
  }

  const openNewWindow = async ({ componentToDisplay }: Prop) => {
    try {
      setComponentToDisplay(componentToDisplay)

      if ('getScreenDetails' in window) {
        const screenDetails: ScreenDetails = await window.getScreenDetails!()

        const secondaryScreen = screenDetails.screens.find(
          (screen) =>
            screen.isExtended &&
            // screen.availLeft > 0 &&
            screen.label !== screenDetails.currentScreen.label
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

          // Render your React component into the new window's body
          displayComponent()
        } else {
          alert('No extended display found or permission denied.')
        }
      } else {
        alert('Window Management API not supported in this browser.')
      }
    } catch (error) {
      alert(
        `Could not open a new window. Check your browser permissions. ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    }
  }

  return {
    openNewWindow,
    fullscreenWindow,
    setFullscreenWindow,
  }
}
