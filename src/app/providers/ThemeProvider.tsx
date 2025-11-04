'use client'

import { ReactNode, createContext, useContext, useEffect } from 'react'
import { useSettings } from './settings'

const ThemeContext = createContext<{
  toggleTheme: () => void
  theme: string
} | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettings()
  const theme = settings?.theme || 'system'

  const applyTheme = (themeValue: string) => {
    const root = window.document.documentElement
    root.classList.remove('dark', 'light')

    if (themeValue === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : ''
      if (systemTheme === 'dark') {
        root.classList.add('dark')
      }
      // No class for light mode
    } else if (themeValue === 'dark') {
      root.classList.add('dark')
    }
    // No class for light mode
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Add event listener for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const toggleTheme = () => {
    if (settings) {
      const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
      updateSettings({ ...settings, theme: newTheme })
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
