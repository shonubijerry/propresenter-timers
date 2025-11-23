const pad = (num: number): string => {
  const numStr = num.toString()
  if (numStr.length >= 2) {
    return numStr // Already a double digit, return as is
  }
  return '0' + numStr // Add a leading zero
}

/**
 * Format individual time parts to HH:MM:SS
 * @param hours
 * @param minutes
 * @param seconds
 * @returns
 */
export const formatTime = (
  hours: number,
  minutes: number,
  seconds: number
): string => {
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * Converts seconds to HH:MM:SS
 * @param totalSeconds
 * @returns string
 */
export const formatSecondsToTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * Converts HH:MM:SS to seconds
 * @param timeString
 * @returns number
 */
export const convertTimeToSeconds = (timeString: string): number => {
  const negate = timeString.startsWith('-')
  const parts = timeString.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid time format. Expected "HH:MM:SS"')
  }

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const seconds = parseInt(parts[2], 10)

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error('Invalid number format in time string.')
  }

  return (hours * 3600 + minutes * 60 + seconds) * (negate ? -1 : 1)
}
