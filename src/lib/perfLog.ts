/**
 * Logs a timing line. In the desktop app it goes to the app log file;
 * in the browser, to the console. `performance.now()` is the time since
 * this window started loading.
 */
export const logTiming = (message: string, startedAt?: number) => {
  if (typeof window === 'undefined') return

  const elapsed = Math.round(performance.now() - (startedAt ?? 0))
  const label = window.isTauri
    ? (window.__TAURI_INTERNALS__?.metadata?.currentWebview?.label ?? 'window')
    : 'browser'
  const line = `[timing] ${label}: ${message} in ${elapsed}ms`

  if (!window.isTauri) {
    console.info(line)
    return
  }

  import('@tauri-apps/plugin-log')
    .then(({ info }) => info(line))
    .catch(() => console.info(line))
}
