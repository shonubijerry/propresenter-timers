'use client'

import React, { ReactNode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useShared } from '../../providers/timer'
import toast from 'react-simple-toasts'

export default function useBrowserWindow() {
  const [componentToDisplay, setComponentToDisplay] = useState<ReactNode>()
  const { fullscreenWindow, setFullscreenWindow } = useShared<'browser'>()

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

  const openNewBrowserWindow = async (componentToDisplay?: React.ReactNode) => {
    setComponentToDisplay(componentToDisplay)
    try {
      if ('getScreenDetails' in window) {
        const screenDetails: ScreenDetails = await window.getScreenDetails!()

        console.log(screenDetails)

        const secondaryScreen = screenDetails.screens.find(
          (screen) =>
            !screen.isPrimary &&
            screen.left !== screenDetails.currentScreen.left
        )

        if (secondaryScreen) {
          const windowFeatures = `
            left=${secondaryScreen.availLeft},
            top=${secondaryScreen.availTop},
            width=${secondaryScreen.availWidth},
            height=${secondaryScreen.availHeight},
            popup=true,
            fullscreen=true
          `

          if (!fullscreenWindow || fullscreenWindow.closed) {
            const fs = window.open(
              '?showTime=true',
              'screenWindow',
              windowFeatures
            )
            setFullscreenWindow(fs)
          } else {
            fullscreenWindow.open(
              '?showTime=true',
              'screenWindow',
              windowFeatures
            )
          }
        } else {
          toast('No extended display found or permission denied.')
        }
      } else {
        toast('Window Management API not supported in this browser.')
      }
    } catch (error) {
      toast(
        `Could not open a new window. Check your browser permissions. ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    }
  }

  return {
    openNewBrowserWindow,
  }
}
