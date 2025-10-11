import http from 'http'
import fs from 'fs'
import path from 'path'
import url from 'url'
import { app } from 'electron'
import { Logger } from './logger'

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

export class LocalServer {
  private server: http.Server | null = null
  private port: number = 0
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((request, response) => {
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
            this.logger.log(`File not found: ${staticPath}`)
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
      this.server.listen(0, 'localhost', (err?: Error) => {
        if (err) {
          reject(err)
          return
        }

        const address = this.server?.address()
        if (address && typeof address === 'object') {
          this.port = address.port
          this.logger.log(`Local server started on port ${this.port}`)
          resolve(this.port)
        } else {
          reject(new Error('Failed to get server address'))
        }
      })
    })
  }

  close(): void {
    if (this.server) {
      this.server.close()
      this.logger.log('Local server closed')
      this.server = null
    }
  }

  getPort(): number {
    return this.port
  }

  isRunning(): boolean {
    return this.server !== null
  }
}
