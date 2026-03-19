'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Button from '../ui/Button'
import {
  TimerAnalyticsRangeSummary,
  TimerAnalyticsDailySummary,
  TimerAnalyticsTotals,
} from '@/app/interfaces/analytics'
import { formatSecondsToTime } from '@/lib/formatter'

interface AnalyticsDialogProps {
  open: boolean
  onClose: () => void
  isAvailable: boolean
  onLoad: (fromDate: string, toDate: string) => Promise<TimerAnalyticsRangeSummary>
}

const getTodayDateInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const emptyTotals: TimerAnalyticsTotals = {
  activeCount: 0,
  actualTimeSeconds: 0,
  runningTimeSeconds: 0,
  overrunningTimeSeconds: 0,
}

export default function AnalyticsDialog({
  open,
  onClose,
  isAvailable,
  onLoad,
}: AnalyticsDialogProps) {
  const [fromDate, setFromDate] = useState(getTodayDateInputValue())
  const [toDate, setToDate] = useState(getTodayDateInputValue())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<TimerAnalyticsRangeSummary | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSummary(null)
  }, [open])

  const totals = useMemo(() => summary?.totals ?? emptyTotals, [summary])

  const chartMax = useMemo(() => {
    if (!summary?.days.length) return 0

    return Math.max(
      ...summary.days.map((day) =>
        Math.max(
          day.totals.actualTimeSeconds,
          day.totals.runningTimeSeconds,
          day.totals.overrunningTimeSeconds
        )
      )
    )
  }, [summary])

  const buildCsv = (rangeSummary: TimerAnalyticsRangeSummary): string => {
    const csvEscape = (value: string | number) => {
      const stringValue = String(value)
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replaceAll('"', '""')}"`
      }
      return stringValue
    }

    const lines: string[] = []
    lines.push('Report Type,Timer Analytics')
    lines.push(`From Date,${csvEscape(rangeSummary.fromDate)}`)
    lines.push(`To Date,${csvEscape(rangeSummary.toDate)}`)
    lines.push('')
    lines.push('Totals')
    lines.push('Metric,Value')
    lines.push(`Active Count,${rangeSummary.totals.activeCount}`)
    lines.push(`Actual Time (HH:MM:SS),${formatSecondsToTime(rangeSummary.totals.actualTimeSeconds)}`)
    lines.push(`Running Time (HH:MM:SS),${formatSecondsToTime(rangeSummary.totals.runningTimeSeconds)}`)
    lines.push(`Overrun Time (HH:MM:SS),${formatSecondsToTime(rangeSummary.totals.overrunningTimeSeconds)}`)
    lines.push('')
    lines.push('Per Timer by Day')
    rangeSummary.days.forEach((day) => {
      lines.push(`Date,${csvEscape(day.date)}`)
      lines.push('Timer,Active Count,Actual Time (HH:MM:SS),Running Time (HH:MM:SS),Overrun Time (HH:MM:SS)')
      day.entries.forEach((entry) => {
        lines.push(
          [
            csvEscape(entry.timerName),
            entry.activeCount,
            csvEscape(formatSecondsToTime(entry.actualTimeSeconds)),
            csvEscape(formatSecondsToTime(entry.runningTimeSeconds)),
            csvEscape(formatSecondsToTime(entry.overrunningTimeSeconds)),
          ].join(',')
        )
      })
      lines.push('')
    })
    lines.push('')
    lines.push('Per Day')
    lines.push('Date,Active Count,Actual Time (HH:MM:SS),Running Time (HH:MM:SS),Overrun Time (HH:MM:SS)')
    rangeSummary.days.forEach((day) => {
      lines.push(
        [
          csvEscape(day.date),
          day.totals.activeCount,
          csvEscape(formatSecondsToTime(day.totals.actualTimeSeconds)),
          csvEscape(formatSecondsToTime(day.totals.runningTimeSeconds)),
          csvEscape(formatSecondsToTime(day.totals.overrunningTimeSeconds)),
        ].join(',')
      )
    })

    return lines.join('\n')
  }

  const downloadCsv = (rangeSummary: TimerAnalyticsRangeSummary) => {
    const csv = buildCsv(rangeSummary)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const fileName = `timer-analytics-${rangeSummary.fromDate}_to_${rangeSummary.toDate}.csv`
    anchor.href = url
    anchor.download = fileName
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const handleLoad = async () => {
    if (!fromDate || !toDate) return
    if (fromDate > toDate) {
      setError('Invalid period: from date must be before or equal to to date')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const data = await onLoad(fromDate, toDate)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      setSummary(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title='Timer Analytics' size='xl'>
      <div className='space-y-4'>
        {!isAvailable ? (
          <div
            className='rounded-xl border p-3 text-sm'
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--muted-foreground)',
            }}
          >
            Timer analytics is available in desktop mode where the local
            SQLite table is accessible.
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-end gap-3'>
              <label className='flex flex-col gap-1'>
                <span
                  className='text-xs font-semibold uppercase tracking-[0.12em]'
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  From
                </span>
                <input
                  type='date'
                  value={fromDate}
                  max={getTodayDateInputValue()}
                  onChange={(e) => setFromDate(e.target.value)}
                  className='rounded-lg border px-3 py-2 text-sm'
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-1)',
                    color: 'var(--foreground)',
                  }}
                />
              </label>
              <label className='flex flex-col gap-1'>
                <span
                  className='text-xs font-semibold uppercase tracking-[0.12em]'
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  To
                </span>
                <input
                  type='date'
                  value={toDate}
                  max={getTodayDateInputValue()}
                  onChange={(e) => setToDate(e.target.value)}
                  className='rounded-lg border px-3 py-2 text-sm'
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-1)',
                    color: 'var(--foreground)',
                  }}
                />
              </label>
              <Button onClick={handleLoad} disabled={isLoading || !fromDate || !toDate}>
                {isLoading ? 'Loading...' : 'Generate'}
              </Button>
              <Button
                variant='outline'
                onClick={() => summary && downloadCsv(summary)}
                disabled={!summary || summary.days.length === 0}
              >
                Download CSV
              </Button>
            </div>

            {error ? (
              <div
                className='rounded-xl border p-3 text-sm'
                style={{
                  borderColor: 'var(--destructive)',
                  background:
                    'color-mix(in srgb, var(--destructive) 8%, var(--surface-1) 92%)',
                  color: 'var(--destructive)',
                }}
              >
                {error}
              </div>
            ) : null}

            {summary ? (
              <div className='space-y-4'>
                <div
                  className='rounded-xl border p-3 text-sm'
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <p>
                    <span style={{ color: 'var(--muted-foreground)' }}>Period: </span>
                    <strong>{summary.fromDate}</strong> to <strong>{summary.toDate}</strong>
                  </p>
                </div>

                {summary.days.length > 0 ? (
                  <div className='rounded-xl border p-3 space-y-3' style={{ borderColor: 'var(--border)' }}>
                    <p className='text-sm font-semibold' style={{ color: 'var(--foreground)' }}>
                      Daily Comparison (seconds)
                    </p>
                    <div className='space-y-2'>
                      {summary.days.map((day) => (
                        <DailyComparisonRow key={day.date} day={day} maxValue={chartMax} />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className='overflow-x-auto rounded-xl border'>
                  <table
                    className='w-full text-sm'
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <thead
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      <tr>
                        <th className='text-left px-3 py-2 font-semibold'>Timer</th>
                        <th className='text-right px-3 py-2 font-semibold'>Active</th>
                        <th className='text-right px-3 py-2 font-semibold'>Actual Time</th>
                        <th className='text-right px-3 py-2 font-semibold'>Running Time</th>
                        <th className='text-right px-3 py-2 font-semibold'>Overrun Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.entries.length === 0 ? (
                        <tr>
                          <td
                            className='px-3 py-4 text-center'
                            colSpan={5}
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            No analytics entries found in this period.
                          </td>
                        </tr>
                      ) : (
                        summary.entries.map((entry) => (
                          <tr
                            key={entry.timerUuid}
                            className='border-t'
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <td className='px-3 py-2'>{entry.timerName}</td>
                            <td className='px-3 py-2 text-right'>{entry.activeCount}</td>
                            <td className='px-3 py-2 text-right font-mono'>
                              {formatSecondsToTime(entry.actualTimeSeconds)}
                            </td>
                            <td className='px-3 py-2 text-right font-mono'>
                              {formatSecondsToTime(entry.runningTimeSeconds)}
                            </td>
                            <td className='px-3 py-2 text-right font-mono'>
                              {formatSecondsToTime(entry.overrunningTimeSeconds)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  className='rounded-xl border p-3 text-sm'
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2'>
                    <p>
                      <span style={{ color: 'var(--muted-foreground)' }}>Total Active: </span>
                      <strong>{totals.activeCount}</strong>
                    </p>
                    <p>
                      <span style={{ color: 'var(--muted-foreground)' }}>Total Actual: </span>
                      <strong className='font-mono'>
                        {formatSecondsToTime(totals.actualTimeSeconds)}
                      </strong>
                    </p>
                    <p>
                      <span style={{ color: 'var(--muted-foreground)' }}>Total Running: </span>
                      <strong className='font-mono'>
                        {formatSecondsToTime(totals.runningTimeSeconds)}
                      </strong>
                    </p>
                    <p>
                      <span style={{ color: 'var(--muted-foreground)' }}>Total Overrun: </span>
                      <strong className='font-mono'>
                        {formatSecondsToTime(totals.overrunningTimeSeconds)}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  )
}

function DailyComparisonRow({
  day,
  maxValue,
}: {
  day: TimerAnalyticsDailySummary
  maxValue: number
}) {
  const getWidth = (value: number) => {
    if (!maxValue) return '0%'
    return `${Math.max(2, (value / maxValue) * 100)}%`
  }

  return (
    <div className='space-y-1'>
      <p className='text-xs font-semibold' style={{ color: 'var(--muted-foreground)' }}>
        {day.date}
      </p>
      <div className='space-y-1'>
        <MetricBar
          label='Actual'
          value={day.totals.actualTimeSeconds}
          width={getWidth(day.totals.actualTimeSeconds)}
          color='var(--ring)'
        />
        <MetricBar
          label='Running'
          value={day.totals.runningTimeSeconds}
          width={getWidth(day.totals.runningTimeSeconds)}
          color='var(--green)'
        />
        <MetricBar
          label='Overrun'
          value={day.totals.overrunningTimeSeconds}
          width={getWidth(day.totals.overrunningTimeSeconds)}
          color='var(--destructive)'
        />
      </div>
    </div>
  )
}

function MetricBar({
  label,
  value,
  width,
  color,
}: {
  label: string
  value: number
  width: string
  color: string
}) {
  return (
    <div className='flex items-center gap-2 text-xs'>
      <span style={{ color: 'var(--muted-foreground)' }} className='w-14'>
        {label}
      </span>
      <div
        className='h-2.5 w-full rounded-full overflow-hidden'
        style={{ background: 'var(--surface-3)' }}
      >
        <div className='h-full rounded-full' style={{ width, background: color }} />
      </div>
      <span className='font-mono w-16 text-right' style={{ color: 'var(--foreground)' }}>
        {value}
      </span>
    </div>
  )
}
