import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import * as path from 'path'

import 'dotenv/config'
import { Logger } from './lib/logger'
import { LocalServer } from './lib/server'
import { menuTemplate } from './lib/menu_template'
import { loadSettings, saveSettings } from './lib/settings'
import { checkForFolderUpdate } from './lib/updater'

let localServer: LocalServer | null = null
let mainWindow: BrowserWindow | null = null
const logger = new Logger(app.getPath('userData'))

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  const config = {
    isDev,
    isPackaged: app.isPackaged,
    platform: process.platform,
    dirname: __dirname,
    resourcesPath: process.resourcesPath,
    architecture: process.arch,
  }

  logger.log(`Starting application\n${JSON.stringify(config, null, 2)}`)

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add your app icon
    show: false, // Don't show until ready
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // Use local server for production to ensure assets load correctly
    localServer = new LocalServer(logger)

    localServer
      .start()
      .then((port) => {
        logger.log(`Loading app from local server on port ${port}`)
        mainWindow?.loadURL(`http://localhost:${port}`)
      })
      .catch((err) => {
        logger.log(`Failed to start local server: ${err}`)
        // Fallback to direct file loading
        const fallbackPath = path.join(
          process.resourcesPath,
          'app',
          'out/index.html'
        )
        logger.log(`Fallback: loading file directly from ${fallbackPath}`)
        mainWindow?.loadFile(fallbackPath)
      })
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
    app.quit()
  })

  // Debug: Log when navigation fails
  mainWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription, validatedURL) => {
      logger.log(
        `Failed to load: ${errorCode} - ${errorDescription} - ${validatedURL}`
      )
    }
  )

  // Debug: Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    logger.log('Page finished loading')
  })
}

function setupIpcHandlers(): void {
  ipcMain.handle('get-settings', async () => {
    return await loadSettings(app, logger)
  })

  ipcMain.handle('save-settings', async (_event, settings) => {
    try {
      await saveSettings(app, logger, settings)
      // Optionally notify all windows about the update
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('settings-updated', settings)
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

// App event listeners
app.whenReady().then(async () => {
  try {
    await checkForFolderUpdate(logger)
    setupIpcHandlers()
    createWindow()
  } catch (error) {
    logger.log(
      `Error loading - ${JSON.stringify(error)} - ${(error as Error).message}`
    )
  }
})

app.on('window-all-closed', () => {
  // Close the server when all windows are closed
  if (localServer) {
    localServer.close()
  }

  if (logger) {
    logger.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  // Ensure server is closed before quitting
  if (localServer) {
    localServer.close()
  }

  if (logger) {
    logger.close()
  }
})

const menu = Menu.buildFromTemplate(menuTemplate(app))
Menu.setApplicationMenu(menu)
