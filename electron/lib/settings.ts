import { Logger } from './logger'
import fs from 'fs/promises'
import path from 'path'
import type { App } from 'electron'

export interface Settings {
  address?: string
  port?: string
  // add more fields as needed
}

export async function loadSettings(
  app: App,
  logger: Logger
): Promise<Settings> {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  logger.log(`loading settings from: ${settingsPath}`)

  try {
    const data = await fs.readFile(settingsPath, 'utf-8')
    return JSON.parse(data) as Settings
  } catch (error) {
    logger.log(`Failed to load settings: ${error}`)
    return {}
  }
}

export async function saveSettings(
  app: App,
  logger: Logger,
  settings: Settings
): Promise<void> {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')

  try {
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    logger.log('Settings saved successfully')
  } catch (error) {
    logger.log(`Failed to save settings: ${error}`)
    throw error
  }
}
