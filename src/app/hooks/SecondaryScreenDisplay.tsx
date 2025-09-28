'use client'

import React, { Dispatch, SetStateAction } from 'react'
import { createRoot } from 'react-dom/client'

// Extend the Window interface to include getScreenDetails
declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetails>
  }
}

type Prop = {
  componentToDisplay: React.ReactNode
  fsWindow?: Window | null
  setFsWindow: Dispatch<SetStateAction<Window | null | undefined>>
}

// Type definitions for Window Management API
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

export default function useSecondScreenDisplay() {
  const openNewWindow = async ({
    componentToDisplay,
    fsWindow,
    setFsWindow,
  }: Prop) => {
    try {
      if ('getScreenDetails' in window) {
        const screenDetails: ScreenDetails = await window.getScreenDetails!()

        console.log(screenDetails)

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
            width=${secondaryScreen.width},
            height=${secondaryScreen.height},
            menubar=no,
            toolbar=no,
            location=no,
            status=no,
            resizable=yes,
            scrollbars=no
          `

          if (!fsWindow || fsWindow.closed) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fsWindow = (window as any).open(
              '',
              'screenWindow',
              windowFeatures
            )
            setFsWindow(fsWindow)
          } else {
            fsWindow.focus()
          }

          // Render your React component into the new window's body
          if (fsWindow) {
            fsWindow.document.body.style.margin = '0'
            fsWindow.document.body.innerHTML =
              '<div id="root-second-screen"></div>'

            const node = fsWindow.document.getElementById('root-second-screen')
            if (node) {
              createRoot(node).render(componentToDisplay)
            }
          }
        } else {
          alert('No extended display found or permission denied.')
        }
      } else {
        alert('Window Management API not supported in this browser.')
      }
    } catch (error) {
      console.error('Error opening new window:', error)
      alert('Could not open a new window. Check your browser permissions.')
    }
  }

  return {
    openNewWindow,
  }
}
