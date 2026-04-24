import { formatSecondsToTime } from '@/lib/formatter'
import { Timer } from '@/app/interfaces/time'
import { TimerActions } from '@/app/hooks/timer'
import { DbService } from './database'
import Database from '@tauri-apps/plugin-sql'
import { v4 as uuidv4 } from 'uuid'
import { SqliteFluidTimer } from '@/app/interfaces/settings'
import {
  getTimerAnalyticsByRange,
  getTimerAnalyticsByDate,
  recordTimerRunEnd,
  recordTimerRunStart,
} from './timerAnalyticsDb'

// Type for the SQLite timer structure
interface SqliteTimer {
  uuid: string
  id: number
  name: string
  allows_overrun: boolean
  countdown_duration: number
  state: 'stopped' | 'running' | 'complete' | 'overran' | 'overrunning'
  remaining_seconds: number
  started_at: number | null
  created_at: number
  updated_at: number
}

// Helper function to get timer service instance
const getTimerService = (db?: Database) => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return new DbService<SqliteTimer>('timers', 'uuid', db)
}

const getFluidTimerService = (db?: Database) => {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return new DbService<SqliteFluidTimer>('fluid_timers', 'timer_id', db)
}

const isFluidTimer = async (timerId: string, db?: Database): Promise<boolean> => {
  const fluidTimerService = getFluidTimerService(db)
  const fluidTimer = await fluidTimerService.findById(timerId, 'timer_id')
  return Boolean(fluidTimer)
}

export const getFluidTimerIds = async (db?: Database): Promise<string[]> => {
  const fluidTimerService = getFluidTimerService(db)
  const fluidRecords = await fluidTimerService.findAll('id')
  return fluidRecords.map(f => f.timer_id)
}

const getRemainingSeconds = ({
  remaining_seconds,
  started_at,
}: SqliteTimer) => {
  const now = Math.floor(Date.now() / 1000)
  const elapsedTime = now - (started_at ?? now)
  const remaining = Math.floor(remaining_seconds - elapsedTime)
  const negative = remaining < 0

  return {
    remainingSeconds: remaining,
    time: negative
      ? `-${formatSecondsToTime(remaining * -1)}`
      : formatSecondsToTime(remaining),
  }
}

/**
 * Convert SQLite timer format to ProPresenter Timer format
 */
const convertSqliteToTimer = (sqliteTimer: SqliteTimer): Timer => {
  return {
    id: {
      uuid: sqliteTimer.uuid,
      name: sqliteTimer.name,
      index: sqliteTimer.id,
    },
    allows_overrun: sqliteTimer.allows_overrun,
    countdown: {
      duration: sqliteTimer.countdown_duration,
    },
    state: sqliteTimer.state,
    // Convert remaining seconds to time format (HH:MM:SS)
    ...getRemainingSeconds(sqliteTimer),
  }
}

/**
 * Fetch all timers from SQLite
 */
export const fetchTimersFromDb = async (db?: Database): Promise<Timer[]> => {
  const timerService = getTimerService(db)
  const fluidTimerService = getFluidTimerService(db)
  const sqliteTimers = await timerService.findAll('id')
  const fluidTimters = (await fluidTimerService.findAll('id')).map(
    (t) => t.timer_id
  )

  return sqliteTimers.map(convertSqliteToTimer).map((t) => ({
    ...t,
    isFluid: fluidTimters.includes(t.id.uuid),
  }))
}

/**
 * Get single timer from SQLite
 */
export const getTimerFromDb = async (uuid: string, db?: Database) => {
  const timerService = getTimerService(db)
  return await timerService.findById(uuid)
}

/**
 * Create a timer in SQLite
 */
export const createTimerInDb = async (
  duration: number,
  name: string,
  db?: Database
): Promise<Timer> => {
  const timerService = getTimerService(db)
  const now = Math.floor(Date.now() / 1000)

  const newTimer = await timerService.create({
    uuid: uuidv4(),
    name,
    allows_overrun: true,
    countdown_duration: duration,
    state: 'stopped',
    remaining_seconds: duration,
    started_at: null,
    created_at: now,
    updated_at: now,
  })

  return convertSqliteToTimer(newTimer)
}

/**
 * Update a timer in SQLite
 */
export const editTimerInDb = async (
  payload: Partial<SqliteTimer>,
  db?: Database
): Promise<Timer> => {
  if (!payload?.uuid) throw new Error('Id not set for update')

  const timerService = getTimerService(db)
  const updates = {
    ...payload,
    allows_overrun: true,
    updated_at: Math.floor(Date.now() / 1000),
  }
  delete updates.uuid

  const updated = await timerService.update(payload.uuid, updates)
  return convertSqliteToTimer(updated)
}

/**
 * Delete a timer from SQLite
 */
export const deleteTimerFromDb = async (
  id?: string,
  db?: Database
): Promise<void> => {
  if (!id) throw new Error('Id not set for delete')
  const timerService = getTimerService(db)
  if (!(await isFluidTimer(id, db))) {
    await recordTimerRunEnd(id, 'reset', db)
  }
  await timerService.delete(id)
}

/**
 * Set timer operation (start, stop, pause, reset) in SQLite
 */
export const setTimerOperationInDb = async (
  operation: string,
  id?: string,
  db?: Database
): Promise<void> => {
  if (!id) throw new Error('Id not set for operation')

  const timer = await getTimerFromDb(id, db)
  const fluidTimer = await isFluidTimer(id, db)

  if (!timer) throw new Error('Timer not found')

  const now = Math.floor(Date.now() / 1000)

  const updates: Partial<SqliteTimer> = { updated_at: now }

  switch (operation) {
    case 'start':
      updates.state = 'running'
      updates.started_at = now
      if (!fluidTimer) {
        await recordTimerRunStart(
          {
            timerUuid: timer.uuid,
            timerName: timer.name,
            scheduledDuration: timer.countdown_duration,
          },
          db,
          now
        )
      }
      break
    case 'stop':
      const elapsedTime = now - (timer.started_at ?? 0)
      updates.state = 'stopped'
      updates.remaining_seconds = Math.floor(
        timer.remaining_seconds - elapsedTime
      )
      updates.started_at = null
      if (!fluidTimer) {
        await recordTimerRunEnd(id, 'stop', db, now)
      }
      break
    case 'reset':
      updates.state = 'stopped'
      updates.remaining_seconds = timer.countdown_duration
      updates.started_at = null
      if (!fluidTimer) {
        await recordTimerRunEnd(id, 'reset', db, now)
      }
      break
    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
  updates.uuid = id

  await editTimerInDb(updates, db)
}

/**
 * Update timer and perform operation in one call
 */
export const setTimerUpdateOperationInDb = async (
  duration: number,
  name: string,
  operation: string,
  id?: string,
  db?: Database
): Promise<Timer> => {
  if (!id) throw new Error('Id not set for operation')

  const timer = await getTimerFromDb(id, db)
  const fluidTimer = await isFluidTimer(id, db)
  if (!timer) throw new Error('Timer not found')

  const now = Math.floor(Date.now() / 1000)
  let state: 'stopped' | 'running' = 'stopped'
  let started_at: number | null = null

  switch (operation) {
    case 'start':
      state = 'running'
      started_at = now
      if (!fluidTimer) {
        await recordTimerRunStart(
          {
            timerUuid: timer.uuid,
            timerName: name.length ? name : timer.name,
            scheduledDuration: duration,
          },
          db,
          now
        )
      }
      break
    case 'stop':
      state = 'stopped'
      if (!fluidTimer) {
        await recordTimerRunEnd(id, 'stop', db, now)
      }
      break
    case 'reset':
      state = 'stopped'
      if (!fluidTimer) {
        await recordTimerRunEnd(id, 'reset', db, now)
      }
      break
    default:
      state = 'stopped'
  }

  const sqliteTimer: Partial<SqliteTimer> = {
    uuid: id,
    countdown_duration: duration,
    remaining_seconds: duration,
    allows_overrun: true,
    state,
    started_at,
    updated_at: now,
  }

  if (name.length) {
    sqliteTimer.name = name
  }

  return editTimerInDb(sqliteTimer, db)
}

/**
 * Perform operation on all timers
 */
export const setAllTimersOperationInDb = async (
  operation: TimerActions,
  db?: Database
): Promise<void> => {
  const timerService = getTimerService(db)
  const fluidTimerService = getFluidTimerService(db)
  const timers = await timerService.findAll('id')
  const fluidTimerIds = new Set(
    (await fluidTimerService.findAll('id')).map((timer) => timer.timer_id)
  )

  const updates = timers.map(async (timer) => {
    const now = Math.floor(Date.now() / 1000)
    const updateData: Partial<SqliteTimer> = { updated_at: now }

    switch (operation) {
      case 'start':
        updateData.state = 'running'
        updateData.started_at = now
        if (!fluidTimerIds.has(timer.uuid)) {
          await recordTimerRunStart(
            {
              timerUuid: timer.uuid,
              timerName: timer.name,
              scheduledDuration: timer.countdown_duration,
            },
            db,
            now
          )
        }
        break
      case 'stop':
        updateData.state = 'stopped'
        updateData.remaining_seconds = timer.countdown_duration
        updateData.started_at = null
        if (!fluidTimerIds.has(timer.uuid)) {
          await recordTimerRunEnd(timer.uuid, 'stop', db, now)
        }
        break
      case 'reset':
        updateData.state = 'stopped'
        updateData.remaining_seconds = timer.countdown_duration
        updateData.started_at = null
        if (!fluidTimerIds.has(timer.uuid)) {
          await recordTimerRunEnd(timer.uuid, 'reset', db, now)
        }
        break
    }
    updateData.uuid = timer.uuid

    await editTimerInDb(updateData, db)
  })

  await Promise.all(updates)
}

export const getTimerAnalyticsByDateFromDb = async (
  date: string,
  db?: Database
): ReturnType<typeof getTimerAnalyticsByDate> => getTimerAnalyticsByDate(date, db)

export const getTimerAnalyticsByRangeFromDb = async (
  fromDate: string,
  toDate: string,
  db?: Database
): ReturnType<typeof getTimerAnalyticsByRange> =>
  getTimerAnalyticsByRange(fromDate, toDate, db)
