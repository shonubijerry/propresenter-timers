export const MIN_TIMER_SECONDS = 60
export const NEW_TIMER_DEFAULT_SECONDS = 600

/**
 * Parses "HH:MM:SS", "MM:SS" or "SS" into seconds. Parts are read from the
 * right, so "10:00" is ten minutes. Returns null for anything unparseable.
 */
export const parseDurationInput = (value: string): number | null => {
  const parts = value.trim().split(':')
  if (parts.length === 0 || parts.length > 3) return null
  if (parts.some((part) => !/^\d+$/.test(part.trim()))) return null

  const [seconds = 0, minutes = 0, hours = 0] = parts
    .map((part) => Number(part.trim()))
    .reverse()

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * The duration the edit form opens with: the live time left while a timer is
 * counting down, otherwise its saved duration.
 */
export const getEditPrefillSeconds = ({
  isActive,
  isOvertime,
  remainingSeconds,
  savedDuration,
}: {
  isActive: boolean
  isOvertime: boolean
  remainingSeconds: number
  savedDuration: number
}): number => {
  if (isActive && !isOvertime) return Math.max(0, remainingSeconds)
  return savedDuration
}

export type TimerEditPlan =
  | { kind: 'invalid'; message: string }
  // Create a new timer with this duration
  | { kind: 'create'; duration: number }
  // Duration untouched: save the name only, leave the clock alone
  | { kind: 'rename' }
  // Running timer with a new duration: restart it from the new value
  | { kind: 'restart'; duration: number }
  // Idle timer with a new duration: save it and reset to it
  | { kind: 'update'; duration: number }

/**
 * Decides what saving the edit form should do. "Changed" means the entered
 * duration differs from the value the form was opened with.
 */
export const planTimerEdit = ({
  isNew,
  isActive,
  enteredSeconds,
  prefillSeconds,
}: {
  isNew: boolean
  isActive: boolean
  enteredSeconds: number | null
  prefillSeconds: number
}): TimerEditPlan => {
  const durationChanged = isNew || enteredSeconds !== prefillSeconds

  if (!durationChanged) return { kind: 'rename' }

  if (enteredSeconds === null) {
    return { kind: 'invalid', message: 'Enter a duration as HH:MM:SS' }
  }

  if (enteredSeconds < MIN_TIMER_SECONDS) {
    return { kind: 'invalid', message: 'Duration must be at least 1 minute' }
  }

  if (isNew) return { kind: 'create', duration: enteredSeconds }
  if (isActive) return { kind: 'restart', duration: enteredSeconds }
  return { kind: 'update', duration: enteredSeconds }
}

/**
 * Time left after pausing a timer. A timer that isn't running keeps the time
 * it already had.
 */
export const getPausedRemainingSeconds = ({
  remainingSeconds,
  startedAt,
  isRunning,
  now,
}: {
  remainingSeconds: number
  startedAt: number | null
  isRunning: boolean
  now: number
}): number => {
  if (!isRunning || startedAt === null) return remainingSeconds
  return Math.floor(remainingSeconds - (now - startedAt))
}

/**
 * ProPresenter keeps returning deleted timers from its API for a while.
 * Hides ids we deleted, and forgets an id once the API stops returning it.
 */
export const filterDeletedTimers = <T extends { id: { uuid: string } }>(
  timers: T[],
  deletedIds: Set<string>
): { timers: T[]; stillListed: Set<string> } => {
  if (deletedIds.size === 0) return { timers, stillListed: deletedIds }

  const stillListed = new Set<string>()
  const visible = timers.filter((timer) => {
    if (!deletedIds.has(timer.id.uuid)) return true
    stillListed.add(timer.id.uuid)
    return false
  })

  return { timers: visible, stillListed }
}

export type PendingTimerChange = {
  name?: string
  duration: number
  expiresAt: number
}

// How long to trust a local change over what ProPresenter returns
export const PENDING_CHANGE_TTL_MS = 10_000

/**
 * ProPresenter returns the old config for a moment after a change. Keeps the
 * values we just saved until the API catches up (or the change expires).
 */
export const applyPendingTimerChanges = <
  T extends {
    id: { uuid: string; name: string }
    countdown?: { duration: number }
  },
>(
  timers: T[],
  pending: Map<string, PendingTimerChange>,
  now: number
): { timers: T[]; pending: Map<string, PendingTimerChange> } => {
  if (pending.size === 0) return { timers, pending }

  const stillPending = new Map<string, PendingTimerChange>()

  const merged = timers.map((timer) => {
    const change = pending.get(timer.id.uuid)
    if (!change || change.expiresAt <= now) return timer

    const nameMatches =
      change.name === undefined || change.name === timer.id.name
    const durationMatches = timer.countdown?.duration === change.duration
    if (nameMatches && durationMatches) return timer

    stillPending.set(timer.id.uuid, change)
    return {
      ...timer,
      id: { ...timer.id, name: change.name ?? timer.id.name },
      countdown: { ...timer.countdown, duration: change.duration },
    }
  })

  return { timers: merged, pending: stillPending }
}

/**
 * Where the on-screen countdown stands, as absolute times so another window
 * can rebuild it exactly.
 */
export type CountdownAnchor =
  | { mode: 'idle' }
  | { mode: 'running'; endsAt: number }
  | { mode: 'paused'; remainingSeconds: number }
  | { mode: 'overtime'; startedAt: number }

/** What the main window sends to the screen windows */
export type LiveTimerSnapshot = {
  timer: { uuid: string; name: string; duration: number } | null
  anchor: CountdownAnchor
  sentAt: number
}

export const LIVE_TIMER_STORAGE_KEY = 'agc:live-timer'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isAnchor = (value: unknown): value is CountdownAnchor => {
  if (!value || typeof value !== 'object') return false
  const anchor = value as Record<string, unknown>
  switch (anchor.mode) {
    case 'idle':
      return true
    case 'running':
      return isFiniteNumber(anchor.endsAt)
    case 'paused':
      return isFiniteNumber(anchor.remainingSeconds)
    case 'overtime':
      return isFiniteNumber(anchor.startedAt)
    default:
      return false
  }
}

export const parseLiveTimerSnapshot = (
  raw: string | null
): LiveTimerSnapshot | null => {
  if (!raw) return null

  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!isAnchor(data.anchor) || !isFiniteNumber(data.sentAt)) return null

    const timer = data.timer as Record<string, unknown> | null
    if (
      timer !== null &&
      (typeof timer !== 'object' ||
        typeof timer.uuid !== 'string' ||
        typeof timer.name !== 'string' ||
        !isFiniteNumber(timer.duration))
    ) {
      return null
    }

    return data as unknown as LiveTimerSnapshot
  } catch {
    return null
  }
}

/**
 * Brings an anchor up to date: a countdown whose end has already passed is
 * now in overtime, counted from when it ended.
 */
export const resolveAnchor = (
  anchor: CountdownAnchor,
  now: number
): CountdownAnchor => {
  if (anchor.mode === 'running' && anchor.endsAt <= now) {
    return { mode: 'overtime', startedAt: anchor.endsAt }
  }
  return anchor
}
