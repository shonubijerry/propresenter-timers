import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, ChildProcess } from 'child_process'

import 'dotenv/config'

const NEXT_PORT = parseInt(process.env.NEXT_PORT || '3000')
let nextProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

// Initialize logging
let logStream: fs.WriteStream | null = null

function initializeLogging() {
  try {
    const logPath = path.join(app.getPath('userData'), 'app.log')
    logStream = fs.createWriteStream(logPath, { flags: 'a' })
  } catch (error) {
    console.error('Failed to initialize logging:', error)
  }
}

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`

  if (logStream) {
    logStream.write(line)
  }
  console.log(message)
}

function createWindow(url: string) {
  // Prevent multiple windows
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  log('Creating window...')
  log(`Loading URL: ${url}`)

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log('Window ready and shown')
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.loadURL(url).catch((error) => {
    log(`Failed to load URL: ${error.message}`)
  })

  // Uncomment for debugging
  // if (isDev) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' })
  // }
}

function spawnNext(isDev: boolean): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    try {
      const args = isDev
        ? ['next', 'dev', '-p', String(NEXT_PORT)]
        : ['next', 'start', '-p', String(NEXT_PORT)]

      // Determine working directory
      const cwd = path.join(__dirname, '..', '..')

      // Verify the working directory exists
      if (!fs.existsSync(cwd)) {
        throw new Error(`Working directory does not exist: ${cwd}`)
      }

      log(`Spawning Next.js in ${isDev ? 'development' : 'production'} mode`)
      log(`Working directory: ${cwd}`)
      log(`Command: npx ${args.join(' ')}`)

      const proc = spawn('npx', args, {
        cwd,
        env: {
          ...process.env,
          NODE_ENV: isDev ? 'development' : 'production',
          PORT: String(NEXT_PORT),
        },
        stdio: ['pipe', 'pipe', 'pipe'], // Capture output for better error handling
      })

      // Handle process output
      proc.stdout?.on('data', (data) => {
        const output = data.toString().trim()
        log(`[Next.js stdout]: ${output}`)

        if (output.includes('Starting...') || output.includes('Ready on')) {
          createWindow(`http://localhost:${NEXT_PORT}`)
        }
      })

      proc.stderr?.on('data', (data) => {
        const output = data.toString().trim()
        log(`[Next.js stderr]: ${output}`)
      })

      proc.on('spawn', () => {
        log('Next.js process spawned successfully')
        resolve(proc)
      })

      proc.on('error', (error) => {
        log(`Next.js process error: ${error.message}`)
        reject(error)
      })

      proc.on('close', (code) => {
        log(`Next.js process exited with code: ${code}`)
        if (code !== 0 && code !== null) {
          // Process exited with error
          nextProcess = null
        }
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      log(`Error spawning Next.js: ${errorMessage}`)
      reject(error)
    }
  })
}

// Determine if running in development mode
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}

app.whenReady().then(async () => {
  initializeLogging()

  const isDev = isDevelopment()
  log(`Starting application in ${isDev ? 'development' : 'production'} mode`)
  log(`App is packaged: ${app.isPackaged}`)
  log(`Resources path: ${process.resourcesPath}`)
  log(`__dirname: ${__dirname}`)

  try {
    // Start Next.js server
    nextProcess = await spawnNext(isDev)
    log('Waiting for Next.js server to be ready...')

    // Wait for the server to be ready
    log(`Next.js server is ready on port ${NEXT_PORT}`)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    log(`Failed to start application: ${errorMessage}`)

    // Show error dialog or create a fallback window
    createWindow(`data:text/html,<h1>Failed to start Next.js server</h1><p>${errorMessage}</p>`)
  }

  // Handle app activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(`http://localhost:${NEXT_PORT}`)
    }
  })
})

// Handle all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app quit
app.on('before-quit', () => {
  log('Application is quitting...')
})

app.on('quit', () => {
  // Clean up Next.js process
  if (nextProcess && !nextProcess.killed) {
    log('Terminating Next.js process...')
    nextProcess.kill('SIGTERM')

    // Force kill after 5 seconds if it doesn't exit gracefully
    setTimeout(() => {
      if (nextProcess && !nextProcess.killed) {
        log('Force killing Next.js process...')
        nextProcess.kill('SIGKILL')
      }
    }, 5000)
  }

  // Close log stream
  if (logStream) {
    logStream.end()
  }

  log('Application quit complete')
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`)
  log(error.stack || '')
})

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`)
})
