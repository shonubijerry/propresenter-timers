import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import * as path from 'path'
import fs from 'fs'
import url from 'url'
import http from 'http'

import 'dotenv/config'
import { Logger } from './lib/logger'

let server: http.Server | null = null
let serverPort: number

// MIME type mapping
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.woff2': 'font/woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
}

function startLocalServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      const parsedUrl = url.parse(request.url || '')
      let pathname = parsedUrl.pathname || '/'

      // Default to index.html for root
      if (pathname === '/') {
        pathname = '/index.html'
      }

      // Determine the correct path for static files
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
      let staticPath: string

      if (isDev) {
        // Development: files are in dist folder relative to __dirname
        staticPath = path.join(__dirname, '..', 'dist', pathname)
      } else {
        // Production: files are in the app.asar or resources path
        staticPath = path.join(process.resourcesPath, 'app', 'out', pathname)

        // Fallback paths to try
        const fallbackPaths = [
          path.join(__dirname, 'dist', pathname),
          path.join(__dirname, '..', 'dist', pathname),
          path.join(process.cwd(), 'dist', pathname),
        ]

        // Check if main path exists, if not try fallbacks
        if (!fs.existsSync(staticPath)) {
          for (const fallbackPath of fallbackPaths) {
            if (fs.existsSync(fallbackPath)) {
              staticPath = fallbackPath
              break
            }
          }
        }
      }

      fs.readFile(staticPath, (err, data) => {
        if (err) {
          logger.log(`File not found: ${staticPath}`)
          response.writeHead(404, { 'Content-Type': 'text/plain' })
          response.end('File not found')
          return
        }

        const ext = path.extname(staticPath).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'

        response.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        })
        response.end(data)
      })
    })

    // Listen on random available port
    server.listen(0, 'localhost', (err?: Error) => {
      if (err) {
        reject(err)
        return
      }

      const address = server?.address()
      if (address && typeof address === 'object') {
        serverPort = address.port
        logger.log(`Local server started on port ${serverPort}`)
        resolve(serverPort)
      } else {
        reject(new Error('Failed to get server address'))
      }
    })
  })
}

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
    // fullscreen: true,
    // simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Set to false to allow local server access
      // webSecurity: false, // Allow local file access
      // allowRunningInsecureContent: true,
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
    startLocalServer()
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

// App event listeners
app.whenReady().then(() => {
  try {
    createWindow()
  } catch (error) {
    logger.log(
      `Error loading - ${JSON.stringify(error)} - ${(error as Error).message}`
    )
  }
})

app.on('window-all-closed', () => {
  // Close the server when all windows are closed
  if (server) {
    server.close()
    logger.log('Local server closed')
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
  if (server) {
    server.close()
    logger.log('Server closed before quit')
  }

  if (logger) {
    logger.close()
  }
})

// Optional: Create custom menu
const template: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => app.quit(),
      },
      {
        label: 'Settings',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => app.quit(),
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
