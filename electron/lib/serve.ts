import * as path from 'path'
import fs from 'fs'
import url from 'url'
import http from 'http'
import { Logger } from './logger'

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

export function startLocalServer(
  app: Electron.App,
  log: Logger['log']
): Promise<{ server: http.Server | null; port: number }> {
  let server: http.Server | null = null
  let serverPort: number

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
          log(`File not found: ${staticPath}`)
          response.writeHead(404, { 'Content-Type': 'text/plain' })
          response.end('File not found')
          resolve({ server, port: serverPort })
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
        log(`Local server started on port ${err}`)
        return resolve({ server, port: serverPort })
      }

      const address = server?.address()
      if (address && typeof address === 'object') {
        serverPort = address.port
        log(`Local server started on port ${serverPort}`)
      } else {
        reject(new Error('Failed to get server address'))
      }
    })

    return resolve({ server, port: serverPort })
  })
}
