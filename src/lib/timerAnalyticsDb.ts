import {
  TimerAnalyticsDailySummary,
  TimerAnalyticsEntry,
  TimerAnalyticsPerDayEntry,
  TimerAnalyticsRangeSummary,
  TimerAnalyticsSummary,
  TimerAnalyticsTotals,
  TimerRunLog,
} from '@/app/interfaces/analytics'
import { DbService } from './database'
import Database from '@tauri-apps/plugin-sql'

interface TimerRunSummaryRow {
  timer_uuid: string
  timer_name: string
  active_count: number
  actual_time_seconds: number
  running_time_seconds: number
  overrunning_time_seconds: number
}

interface DailySummaryRow {
  day: string
  active_count: number
  actual_time_seconds: number
  running_time_seconds: number
  overrunning_time_seconds: number
}

interface PerDayTimerRow {
  day: string
  timer_uuid: string
  timer_name: string
  active_count: number
  actual_time_seconds: number
  running_time_seconds: number
  overrunning_time_seconds: number
}

export interface TimerRunStartPayload {
  timerUuid: string
  timerName: string
  scheduledDuration: number
}

const getTimerRunService = (db?: Database) => {
  if (!db) {
    throw new Error('Database not initialized')
  }

  return new DbService<TimerRunLog>('timer_run_logs', 'id', db)
}

const toEpochSeconds = (value: Date | number) => {
  const timestamp = value instanceof Date ? value.valueOf() : value
  return Math.floor(timestamp / 1000)
}

const dayStartEpoch = (dateStr: string): number => {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.valueOf())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  return toEpochSeconds(date)
}

const dayEndEpoch = (dateStr: string): number => {
  const date = new Date(`${dateStr}T23:59:59`)
  if (Number.isNaN(date.valueOf())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  return toEpochSeconds(date)
}

const getRangeEpoch = (fromDate: string, toDate: string) => {
  const start = dayStartEpoch(fromDate)
  const end = dayEndEpoch(toDate)

  if (start > end) {
    throw new Error('Invalid range: from_date must be before or equal to to_date')
  }

  return { start, end }
}

export const recordTimerRunEnd = async (
  timerUuid: string,
  endAction: 'stop' | 'reset',
  db?: Database,
  endedAt?: number
): Promise<void> => {
  const timerRunService = getTimerRunService(db)
  const now = endedAt ?? toEpochSeconds(Date.now())

  const openRuns = await timerRunService.raw(
    `SELECT * FROM timer_run_logs WHERE timer_uuid = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
    [timerUuid]
  )

  const currentRun = (openRuns as TimerRunLog[])[0]
  if (!currentRun) return

  await timerRunService.update(currentRun.id, {
    ended_at: now,
    end_action: endAction,
    updated_at: now,
  })
}

export const recordTimerRunStart = async (
  payload: TimerRunStartPayload,
  db?: Database,
  startedAt?: number
): Promise<void> => {
  const timerRunService = getTimerRunService(db)
  const now = startedAt ?? toEpochSeconds(Date.now())

  await recordTimerRunEnd(payload.timerUuid, 'reset', db, now)

  await timerRunService.create({
    timer_uuid: payload.timerUuid,
    timer_name: payload.timerName,
    scheduled_duration: payload.scheduledDuration,
    started_at: now,
    ended_at: null,
    end_action: null,
    created_at: now,
    updated_at: now,
  })
}

export const recordAllTimerRunEnds = async (
  endAction: 'stop' | 'reset',
  db?: Database,
  endedAt?: number
): Promise<void> => {
  const timerRunService = getTimerRunService(db)
  const now = endedAt ?? toEpochSeconds(Date.now())

  await timerRunService.raw(
    `UPDATE timer_run_logs
     SET ended_at = $1,
         end_action = $2,
         updated_at = $1
     WHERE ended_at IS NULL`,
    [String(now), endAction]
  )
}

export const getTimerAnalyticsByDate = async (
  date: string,
  db?: Database
): Promise<TimerAnalyticsSummary> => {
  const range = await getTimerAnalyticsByRange(date, date, db)
  const daySummary = range.days[0]

  return {
    date,
    entries: daySummary?.entries ?? [],
    totals: daySummary?.totals ?? {
      activeCount: 0,
      actualTimeSeconds: 0,
      runningTimeSeconds: 0,
      overrunningTimeSeconds: 0,
    },
  }
}

export const getTimerAnalyticsByRange = async (
  fromDate: string,
  toDate: string,
  db?: Database
): Promise<TimerAnalyticsRangeSummary> => {
  const timerRunService = getTimerRunService(db)
  const { start, end } = getRangeEpoch(fromDate, toDate)

  const rows = (await timerRunService.raw(
    `SELECT
      timer_uuid,
      MAX(timer_name) AS timer_name,
      COUNT(*) AS active_count,
      SUM(scheduled_duration) AS actual_time_seconds,
      SUM(CASE WHEN ended_at > started_at THEN ended_at - started_at ELSE 0 END) AS running_time_seconds,
      SUM(CASE
        WHEN (ended_at - started_at) > scheduled_duration THEN (ended_at - started_at) - scheduled_duration
        ELSE 0
      END) AS overrunning_time_seconds
    FROM timer_run_logs
    WHERE ended_at IS NOT NULL
      AND ended_at >= $1
      AND ended_at <= $2
    GROUP BY timer_uuid
    ORDER BY timer_name COLLATE NOCASE ASC`,
    [String(start), String(end)]
  )) as TimerRunSummaryRow[]

  const entries = rows.map((row) => ({
    timerUuid: row.timer_uuid,
    timerName: row.timer_name,
    activeCount: Number(row.active_count) || 0,
    actualTimeSeconds: Math.floor(Number(row.actual_time_seconds) || 0),
    runningTimeSeconds: Math.floor(Number(row.running_time_seconds) || 0),
    overrunningTimeSeconds: Math.floor(Number(row.overrunning_time_seconds) || 0),
  }))

  const totals = entries.reduce<TimerAnalyticsTotals>(
    (acc, entry) => {
      acc.activeCount += entry.activeCount
      acc.actualTimeSeconds += entry.actualTimeSeconds
      acc.runningTimeSeconds += entry.runningTimeSeconds
      acc.overrunningTimeSeconds += entry.overrunningTimeSeconds
      return acc
    },
    {
      activeCount: 0,
      actualTimeSeconds: 0,
      runningTimeSeconds: 0,
      overrunningTimeSeconds: 0,
    }
  )

  const dailyRows = (await timerRunService.raw(
    `SELECT
      date(ended_at, 'unixepoch') AS day,
      COUNT(*) AS active_count,
      SUM(scheduled_duration) AS actual_time_seconds,
      SUM(CASE WHEN ended_at > started_at THEN ended_at - started_at ELSE 0 END) AS running_time_seconds,
      SUM(CASE
        WHEN (ended_at - started_at) > scheduled_duration THEN (ended_at - started_at) - scheduled_duration
        ELSE 0
      END) AS overrunning_time_seconds
    FROM timer_run_logs
    WHERE ended_at IS NOT NULL
      AND ended_at >= $1
      AND ended_at <= $2
    GROUP BY day
    ORDER BY day ASC`,
    [String(start), String(end)]
  )) as DailySummaryRow[]

  const perDayTimerRows = (await timerRunService.raw(
    `SELECT
      date(ended_at, 'unixepoch') AS day,
      timer_uuid,
      MAX(timer_name) AS timer_name,
      COUNT(*) AS active_count,
      SUM(scheduled_duration) AS actual_time_seconds,
      SUM(CASE WHEN ended_at > started_at THEN ended_at - started_at ELSE 0 END) AS running_time_seconds,
      SUM(CASE
        WHEN (ended_at - started_at) > scheduled_duration THEN (ended_at - started_at) - scheduled_duration
        ELSE 0
      END) AS overrunning_time_seconds
    FROM timer_run_logs
    WHERE ended_at IS NOT NULL
      AND ended_at >= $1
      AND ended_at <= $2
    GROUP BY day, timer_uuid
    ORDER BY day ASC, timer_name COLLATE NOCASE ASC`,
    [String(start), String(end)]
  )) as PerDayTimerRow[]

  const perDayEntriesMap = new Map<string, TimerAnalyticsEntry[]>()
  perDayTimerRows.forEach((row) => {
    const entry: TimerAnalyticsPerDayEntry = {
      date: row.day,
      timerUuid: row.timer_uuid,
      timerName: row.timer_name,
      activeCount: Number(row.active_count) || 0,
      actualTimeSeconds: Math.floor(Number(row.actual_time_seconds) || 0),
      runningTimeSeconds: Math.floor(Number(row.running_time_seconds) || 0),
      overrunningTimeSeconds: Math.floor(
        Number(row.overrunning_time_seconds) || 0
      ),
    }

    const dayEntries = perDayEntriesMap.get(row.day) ?? []
    dayEntries.push(entry)
    perDayEntriesMap.set(row.day, dayEntries)
  })

  const days = dailyRows.map<TimerAnalyticsDailySummary>((row) => ({
    date: row.day,
    totals: {
      activeCount: Number(row.active_count) || 0,
      actualTimeSeconds: Math.floor(Number(row.actual_time_seconds) || 0),
      runningTimeSeconds: Math.floor(Number(row.running_time_seconds) || 0),
      overrunningTimeSeconds: Math.floor(
        Number(row.overrunning_time_seconds) || 0
      ),
    },
    entries: perDayEntriesMap.get(row.day) ?? [],
  }))

  return {
    fromDate,
    toDate,
    entries,
    totals,
    days,
  }
}
