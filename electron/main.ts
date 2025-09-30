import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { execSync } from 'child_process'

import 'dotenv/config'

import { logger } from './lib/logger'

const NEXT_PORT = parseInt(process.env.NEXT_PORT || '3000')
let nextProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

function createWindow(url: string) {
  // Prevent multiple windows
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    show: false, // Don't show until ready
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  logger.log('Creating window...')
  logger.log(`Loading URL: ${url}`)

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    logger.log('Window ready and shown')
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.loadURL(url).catch((error) => {
    logger.log(`Failed to load URL: ${error.message}`)
  })
}

// Find the Node.js executable
function findNodeExecutable(): string {
  const isWindows = process.platform === 'win32'

  try {
    // Try to find Node.js in PATH
    const whichCommand = isWindows ? 'where' : 'which'
    const nodeCommand = isWindows ? 'node.exe' : 'node'
    const nodePath = execSync(`${whichCommand} ${nodeCommand}`, {
      encoding: 'utf8',
      timeout: 5000,
    })
      .trim()
      .split('\n')[0] // Take first result on Windows

    if (nodePath && fs.existsSync(nodePath)) {
      logger.log(`Found Node.js in PATH: ${nodePath}`)
      return nodePath
    }
  } catch (error) {
    logger.log(`Could not find Node.js in PATH: ${error}`)
  }

  // Fallback to common locations
  const commonPaths = isWindows
    ? [
        'C:\\Program Files\\nodejs\\node.exe',
        'C:\\Program Files (x86)\\nodejs\\node.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs\\nodejs\\node.exe'),
        path.join(process.env.PROGRAMFILES || '', 'nodejs\\node.exe'),
      ]
    : [
        '/usr/local/bin/node',
        '/usr/bin/node',
        '/opt/homebrew/bin/node', // Apple Silicon Homebrew
        '/home/linuxbrew/.linuxbrew/bin/node', // Linux Homebrew
      ]

  for (const nodePath of commonPaths) {
    if (fs.existsSync(nodePath)) {
      logger.log(`Found Node.js at: ${nodePath}`)
      return nodePath
    }
  }

  // Last resort - assume 'node' is in PATH
  logger.log('Could not find Node.js executable, using "node" command')
  return 'node'
}

// Find the Next.js executable
function findNextExecutable(
  projectRoot: string,
  isDev: boolean
): {
  command: string
  args: string[]
} {
  const nodeExe = findNodeExecutable()
  const nextCommand = isDev ? 'dev' : 'start'

  const nextBin = path.join(
    projectRoot,
    'node_modules',
    'next',
    'dist',
    'bin',
    'next'
  )
  if (fs.existsSync(nextBin)) {
    logger.log(`Using Next.js binary: ${nextBin}`)
    return {
      command: nodeExe,
      args: [nextBin, nextCommand, '-p', String(NEXT_PORT)],
    }
  }

  return {
    command: 'npx',
    args: ['next', nextCommand, '-p', String(NEXT_PORT)],
  }
}

function spawnNext(isDev: boolean): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    try {
      // Determine working directory
      const cwd = path.join(__dirname, '..', '..')

      // Verify the working directory exists
      if (!fs.existsSync(cwd)) {
        throw new Error(`Working directory does not exist: ${cwd}`)
      }

      // Verify package.json exists
      const packageJsonPath = path.join(cwd, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found in: ${cwd}`)
      }

      // Verify node_modules exists
      const nodeModulesPath = path.join(cwd, 'node_modules')
      if (!fs.existsSync(nodeModulesPath)) {
        throw new Error(
          `node_modules not found in: ${cwd}. Please run 'npm install' first.`
        )
      }

      const { command, args } = findNextExecutable(cwd, isDev)

      logger.log(
        `Spawning Next.js in ${isDev ? 'development' : 'production'} mode\nWorking directory: ${cwd}`
      )

      const proc = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          NODE_ENV: isDev ? 'development' : 'production',
          PORT: String(NEXT_PORT),
        },
        stdio: ['pipe', 'pipe', 'pipe'], // Capture output for better error handling
        shell: process.platform === 'win32', // Use shell on Windows for better compatibility
      })

      let serverReady = false

      // Handle process output
      proc.stdout?.on('data', (data) => {
        const output = data.toString().trim()
        logger.log(`[Next.js stdout]: ${output}`)

        // Look for various ready indicators
        if (
          !serverReady &&
          (output.includes('Ready on') ||
            output.includes('Local:') ||
            output.includes('started server on') ||
            output.includes(`http://localhost:${NEXT_PORT}`))
        ) {
          serverReady = true
          createWindow(`http://localhost:${NEXT_PORT}`)
        }
      })

      proc.stderr?.on('data', (data) => {
        const output = data.toString().trim()
        logger.log(`[Next.js stderr]: ${output}`)
      })

      proc.on('spawn', () => {
        logger.log('Next.js process spawned successfully')
        resolve(proc)
      })

      proc.on('error', (error) => {
        logger.log(`Next.js process error: ${error.message}`)

        // Provide helpful error messages
        if (error.message.includes('ENOENT')) {
          logger.log(
            'Could not find the command. Make sure Node.js and Next.js are properly installed.'
          )
        }

        reject(error)
      })

      proc.on('close', (code, signal) => {
        logger.log(
          `Next.js process exited with code: ${code}, signal: ${signal}`
        )
        if (code !== 0 && code !== null) {
          // Process exited with error
          nextProcess = null
        }
      })

      // Fallback: If server doesn't start within 30 seconds, create window anyway
      setTimeout(() => {
        if (!serverReady) {
          logger.log('Server ready timeout - creating window anyway')
          createWindow(`http://localhost:${NEXT_PORT}`)
        }
      }, 30000)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      logger.log(`Error spawning Next.js: ${errorMessage}`)
      reject(error)
    }
  })
}

app.whenReady().then(async () => {
  logger.initialize(app.getPath('userData'))

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

  try {
    // Start Next.js server
    nextProcess = await spawnNext(isDev)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    logger.log(`Failed to start application: ${errorMessage}`)

    // Show error dialog or create a fallback window
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Application Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .error { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #d32f2f; }
            pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Failed to start Next.js server</h1>
            <p><strong>Error:</strong> ${errorMessage}</p>
            <p><strong>Suggestions:</strong></p>
            <ul>
              <li>Make sure Node.js is installed and in your PATH</li>
              <li>Verify that Next.js dependencies are installed (run <code>npm install</code>)</li>
              <li>Check that port ${NEXT_PORT} is not already in use</li>
              <li>Look at the application logs for more details</li>
            </ul>
          </div>
        </body>
      </html>
    `
    createWindow(
      `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`
    )
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
  logger.log('Application is quitting...')
})

app.on('quit', () => {
  // Clean up Next.js process
  if (nextProcess && !nextProcess.killed) {
    // Try graceful shutdown first
    nextProcess.kill('SIGTERM')

    // Force kill after 5 seconds if it doesn't exit gracefully
    setTimeout(() => {
      if (nextProcess && !nextProcess.killed) {
        nextProcess.kill('SIGKILL')
      }
    }, 5000)
  }

  // Close log stream
  logger.close()

  logger.log('Application quit complete')
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.log(`Uncaught exception: ${error.message}\n${error.stack}`)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.log(`Unhandled rejection at: ${promise}, reason: ${reason}`)
})
