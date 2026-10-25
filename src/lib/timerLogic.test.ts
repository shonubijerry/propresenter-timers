import { describe, expect, it } from 'vitest'
import {
  applyPendingTimerChanges,
  parseLiveTimerSnapshot,
  resolveAnchor,
  filterDeletedTimers,
  getEditPrefillSeconds,
  getPausedRemainingSeconds,
  parseDurationInput,
  planTimerEdit,
} from './timerLogic'

describe('parseDurationInput', () => {
  it('reads HH:MM:SS', () => {
    expect(parseDurationInput('01:02:03')).toBe(3723)
  })

  it('reads parts from the right', () => {
    expect(parseDurationInput('10:00')).toBe(600)
    expect(parseDurationInput('45')).toBe(45)
  })

  it('rejects junk', () => {
    expect(parseDurationInput('')).toBeNull()
    expect(parseDurationInput('ab:cd')).toBeNull()
    expect(parseDurationInput('1:2:3:4')).toBeNull()
    expect(parseDurationInput('-1:00')).toBeNull()
  })
})

describe('getEditPrefillSeconds', () => {
  const base = { remainingSeconds: 443, savedDuration: 1800 }

  it('uses the live time left while counting down', () => {
    expect(
      getEditPrefillSeconds({ ...base, isActive: true, isOvertime: false })
    ).toBe(443)
  })

  it('uses the saved duration in overtime', () => {
    expect(
      getEditPrefillSeconds({ ...base, isActive: true, isOvertime: true })
    ).toBe(1800)
  })

  it('uses the saved duration when idle', () => {
    expect(
      getEditPrefillSeconds({ ...base, isActive: false, isOvertime: false })
    ).toBe(1800)
  })
})

describe('planTimerEdit', () => {
  it('only renames when the duration was not touched', () => {
    expect(
      planTimerEdit({
        isNew: false,
        isActive: true,
        enteredSeconds: 443,
        prefillSeconds: 443,
      })
    ).toEqual({ kind: 'rename' })
  })

  it('allows a rename even when the untouched time left is under a minute', () => {
    expect(
      planTimerEdit({
        isNew: false,
        isActive: true,
        enteredSeconds: 30,
        prefillSeconds: 30,
      })
    ).toEqual({ kind: 'rename' })
  })

  it('restarts a running timer from the new duration', () => {
    expect(
      planTimerEdit({
        isNew: false,
        isActive: true,
        enteredSeconds: 900,
        prefillSeconds: 443,
      })
    ).toEqual({ kind: 'restart', duration: 900 })
  })

  it('updates an idle timer', () => {
    expect(
      planTimerEdit({
        isNew: false,
        isActive: false,
        enteredSeconds: 900,
        prefillSeconds: 600,
      })
    ).toEqual({ kind: 'update', duration: 900 })
  })

  it('creates a new timer even with the default duration', () => {
    expect(
      planTimerEdit({
        isNew: true,
        isActive: false,
        enteredSeconds: 600,
        prefillSeconds: 600,
      })
    ).toEqual({ kind: 'create', duration: 600 })
  })

  it('rejects a changed duration under a minute', () => {
    expect(
      planTimerEdit({
        isNew: false,
        isActive: true,
        enteredSeconds: 30,
        prefillSeconds: 443,
      }).kind
    ).toBe('invalid')
  })

  it('rejects an unparseable duration', () => {
    expect(
      planTimerEdit({
        isNew: false,
        isActive: false,
        enteredSeconds: null,
        prefillSeconds: 600,
      }).kind
    ).toBe('invalid')
  })
})

describe('getPausedRemainingSeconds', () => {
  it('subtracts elapsed time from a running timer', () => {
    expect(
      getPausedRemainingSeconds({
        remainingSeconds: 600,
        startedAt: 1000,
        isRunning: true,
        now: 1100,
      })
    ).toBe(500)
  })

  it('goes negative when overrunning', () => {
    expect(
      getPausedRemainingSeconds({
        remainingSeconds: 60,
        startedAt: 1000,
        isRunning: true,
        now: 1100,
      })
    ).toBe(-40)
  })

  it('leaves a stopped timer alone', () => {
    expect(
      getPausedRemainingSeconds({
        remainingSeconds: 300,
        startedAt: null,
        isRunning: false,
        now: 1_700_000_000,
      })
    ).toBe(300)
  })
})

describe('filterDeletedTimers', () => {
  const timer = (uuid: string) => ({ id: { uuid } })

  it('hides deleted timers the API still returns', () => {
    const result = filterDeletedTimers([timer('a'), timer('b')], new Set(['b']))
    expect(result.timers).toEqual([timer('a')])
    expect([...result.stillListed]).toEqual(['b'])
  })

  it('forgets ids the API no longer returns', () => {
    const result = filterDeletedTimers([timer('a')], new Set(['b']))
    expect(result.timers).toEqual([timer('a')])
    expect(result.stillListed.size).toBe(0)
  })
})

describe('applyPendingTimerChanges', () => {
  const timer = (uuid: string, name: string, duration: number) => ({
    id: { uuid, name },
    countdown: { duration },
  })
  const now = 1_000

  it('keeps the saved values while the API still returns old ones', () => {
    const pending = new Map([
      ['a', { name: 'New', duration: 900, expiresAt: now + 5_000 }],
    ])
    const result = applyPendingTimerChanges(
      [timer('a', 'Old', 600), timer('b', 'B', 300)],
      pending,
      now
    )
    expect(result.timers).toEqual([
      timer('a', 'New', 900),
      timer('b', 'B', 300),
    ])
    expect(result.pending.has('a')).toBe(true)
  })

  it('drops the change once the API agrees', () => {
    const pending = new Map([
      ['a', { name: 'New', duration: 900, expiresAt: now + 5_000 }],
    ])
    const result = applyPendingTimerChanges(
      [timer('a', 'New', 900)],
      pending,
      now
    )
    expect(result.timers).toEqual([timer('a', 'New', 900)])
    expect(result.pending.size).toBe(0)
  })

  it('leaves the name alone when the change has no name', () => {
    const pending = new Map([['a', { duration: 900, expiresAt: now + 5_000 }]])
    const result = applyPendingTimerChanges(
      [timer('a', 'Locked', 600)],
      pending,
      now
    )
    expect(result.timers).toEqual([timer('a', 'Locked', 900)])
  })

  it('trusts the API again after the change expires', () => {
    const pending = new Map([['a', { duration: 900, expiresAt: now - 1 }]])
    const result = applyPendingTimerChanges(
      [timer('a', 'A', 600)],
      pending,
      now
    )
    expect(result.timers).toEqual([timer('a', 'A', 600)])
    expect(result.pending.size).toBe(0)
  })
})

describe('parseLiveTimerSnapshot', () => {
  const snapshot = {
    timer: { uuid: 'a', name: 'Sermon', duration: 1800 },
    anchor: { mode: 'running', endsAt: 5_000 },
    sentAt: 1_000,
  }

  it('reads a valid snapshot', () => {
    expect(parseLiveTimerSnapshot(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  it('accepts no active timer', () => {
    const idle = { timer: null, anchor: { mode: 'idle' }, sentAt: 1 }
    expect(parseLiveTimerSnapshot(JSON.stringify(idle))).toEqual(idle)
  })

  it('rejects missing, broken or malformed data', () => {
    expect(parseLiveTimerSnapshot(null)).toBeNull()
    expect(parseLiveTimerSnapshot('{not json')).toBeNull()
    expect(
      parseLiveTimerSnapshot(
        JSON.stringify({ ...snapshot, anchor: { mode: 'running' } })
      )
    ).toBeNull()
    expect(
      parseLiveTimerSnapshot(
        JSON.stringify({ ...snapshot, timer: { uuid: 'a', name: 'x' } })
      )
    ).toBeNull()
  })
})

describe('resolveAnchor', () => {
  it('keeps a countdown that has not ended', () => {
    const anchor = { mode: 'running', endsAt: 2_000 } as const
    expect(resolveAnchor(anchor, 1_000)).toEqual(anchor)
  })

  it('turns an ended countdown into overtime from when it ended', () => {
    expect(resolveAnchor({ mode: 'running', endsAt: 2_000 }, 9_000)).toEqual({
      mode: 'overtime',
      startedAt: 2_000,
    })
  })

  it('leaves other modes alone', () => {
    expect(resolveAnchor({ mode: 'idle' }, 9_000)).toEqual({ mode: 'idle' })
    expect(
      resolveAnchor({ mode: 'paused', remainingSeconds: 30 }, 9_000)
    ).toEqual({ mode: 'paused', remainingSeconds: 30 })
  })
})
