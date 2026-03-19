export interface TimerRunLog {
  id: number
  timer_uuid: string
  timer_name: string
  scheduled_duration: number
  started_at: number
  ended_at: number | null
  end_action: 'stop' | 'reset' | null
  created_at: number
  updated_at: number
}

export interface TimerAnalyticsEntry {
  timerUuid: string
  timerName: string
  activeCount: number
  actualTimeSeconds: number
  runningTimeSeconds: number
  overrunningTimeSeconds: number
}

export interface TimerAnalyticsPerDayEntry extends TimerAnalyticsEntry {
  date: string
}

export interface TimerAnalyticsTotals {
  activeCount: number
  actualTimeSeconds: number
  runningTimeSeconds: number
  overrunningTimeSeconds: number
}

export interface TimerAnalyticsSummary {
  date: string
  entries: TimerAnalyticsEntry[]
  totals: TimerAnalyticsTotals
}

export interface TimerAnalyticsDailySummary {
  date: string
  totals: TimerAnalyticsTotals
  entries: TimerAnalyticsEntry[]
}

export interface TimerAnalyticsRangeSummary {
  fromDate: string
  toDate: string
  entries: TimerAnalyticsEntry[]
  totals: TimerAnalyticsTotals
  days: TimerAnalyticsDailySummary[]
}
