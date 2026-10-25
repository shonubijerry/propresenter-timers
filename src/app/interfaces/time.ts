export interface Timer {
  allows_overrun: boolean
  countdown?: { duration: number }
  count_down_to_time?: {
    time_of_day: number
    period: 'pm' | 'am'
  }
  id: { index: number; name: string; uuid: string }
  state: 'stopped' | 'running' | 'complete' | 'overran' | 'overrunning'
  time: string
  remainingSeconds: number
  isFluid?: boolean
}

/** What the edit form hands back on save */
export interface TimerEditInput {
  name: string
  // null when the duration field can't be parsed
  enteredSeconds: number | null
  // The duration the form opened with, used to tell if it was changed
  prefillSeconds: number
}
