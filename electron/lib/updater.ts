import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import AdmZip from 'adm-zip'
import { Logger } from './logger'

const UPDATABLE_DIR = path.join(process.resourcesPath, 'app', 'out')
const LOCAL_VERSION_FILE = path.join(UPDATABLE_DIR, 'version.json')
const REMOTE_VERSION_URL =
  'https://raw.githubusercontent.com/shonubijerry/propresenter-timers/master/version.json'

interface VersionData {
  version: string
  zipUrl?: string
}

export async function checkForFolderUpdate(logger: Logger): Promise<void> {
  logger.log('Checking for update...')
  try {
    logger.log(`Get local version from ${LOCAL_VERSION_FILE}`)
    const localData: VersionData = JSON.parse(
      fs.readFileSync(LOCAL_VERSION_FILE, 'utf-8')
    )
    logger.log(`local version data ${JSON.stringify(localData)}`)
    const localVersion = localData.version

    // 2️⃣ Get remote version
    const remoteData: VersionData = await fetchJson(REMOTE_VERSION_URL)
    logger.log(`remote version data ${JSON.stringify(remoteData)}`)
    const remoteVersion = remoteData.version

    if (remoteVersion > localVersion) {
      logger.log(`Update found: ${localVersion} → ${remoteVersion}`)

      if (!remoteData.zipUrl) {
        throw new Error('Remote version data missing zipUrl')
      }

      await downloadAndExtract(remoteData.zipUrl, UPDATABLE_DIR)
      fs.writeFileSync(
        LOCAL_VERSION_FILE,
        JSON.stringify({ version: remoteVersion })
      )
      logger.log('✅ Folder updated successfully')
    } else {
      logger.log('No update needed')
    }
  } catch (err) {
    logger.log(
      `Update check failed: \n${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
    )
  }
}

function fetchJson(url: string): Promise<VersionData> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (parseErr) {
            reject(parseErr)
          }
        })
      })
      .on('error', reject)
  })
}

function downloadAndExtract(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmpZip = path.join(app.getPath('temp'), 'update.zip')
    const file = fs.createWriteStream(tmpZip)

    https
      .get(url, (res) => {
        res.pipe(file)
        file.on('finish', () => {
          file.close(() => {
            try {
              const zip = new AdmZip(tmpZip)
              zip.extractAllTo(dest, true)
              fs.unlinkSync(tmpZip)
              resolve()
            } catch (extractErr) {
              reject(extractErr)
            }
          })
        })
      })
      .on('error', (err) => {
        fs.unlink(tmpZip, () => {}) // Clean up on error
        reject(err)
      })
  })
}
