import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import logoWhiteSvg from '../../../../public/logo-white.svg'
import { FiInfo, FiMoreVertical } from 'react-icons/fi'
import { LuTimerReset } from 'react-icons/lu'
import { TimerActions } from '@/app/hooks/timer'
import { AiOutlineFullscreenExit } from 'react-icons/ai'
import IconButton from './IconButton'
import { RiRefreshLine } from 'react-icons/ri'
import { MdCampaign } from 'react-icons/md'
import { DiAptana } from 'react-icons/di'
import { PiChartBarDuotone } from 'react-icons/pi'
import { cn } from '@/lib/cn'
import { useTheme } from '@/app/providers/ThemeProvider'

type HeaderAction = {
  key: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  destructive?: boolean
}

export function Header({
  openSettings,
  onExitFullscreen,
  resetAllTimers,
  refreshTimers,
  onSearch,
  toggleAboutModal,
  openBroadcastModal,
  openAnalyticsModal,
  activeProfileName,
}: {
  openSettings: () => void
  onExitFullscreen: () => void
  resetAllTimers: (action: TimerActions) => Promise<void>
  refreshTimers: () => void
  onSearch: (term: string) => void
  toggleAboutModal: () => void
  openBroadcastModal: () => void
  openAnalyticsModal: () => void
  activeProfileName: string
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (theme === 'dark') {
      setIsDarkMode(true)
      return
    }

    if (theme === 'light') {
      setIsDarkMode(false)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateDarkMode = () => setIsDarkMode(mediaQuery.matches)

    updateDarkMode()
    mediaQuery.addEventListener('change', updateDarkMode)

    return () => {
      mediaQuery.removeEventListener('change', updateDarkMode)
    }
  }, [theme])

  const quickActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'refresh',
        label: 'Refresh',
        icon: <RiRefreshLine size={22} />,
        onClick: refreshTimers,
      },
      {
        key: 'broadcast',
        label: 'Broadcast Message',
        icon: <MdCampaign size={22} />,
        onClick: openBroadcastModal,
      },
      {
        key: 'reset',
        label: 'Reset all timers',
        icon: <LuTimerReset size={22} />,
        onClick: () => resetAllTimers('reset'),
        destructive: true,
      },
    ],
    [openBroadcastModal, refreshTimers, resetAllTimers]
  )

  const menuActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'close-screen',
        label: 'Close External Screen',
        icon: <AiOutlineFullscreenExit size={18} />,
        onClick: onExitFullscreen,
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: <DiAptana size={18} />,
        onClick: openSettings,
      },
      {
        key: 'analytics',
        label: 'Analytics',
        icon: <PiChartBarDuotone size={18} />,
        onClick: openAnalyticsModal,
      },
      {
        key: 'about',
        label: 'About',
        icon: <FiInfo size={18} />,
        onClick: toggleAboutModal,
      },
    ],
    [onExitFullscreen, openSettings, openAnalyticsModal, toggleAboutModal]
  )

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  return (
    <div
      className='sticky top-0 z-20 backdrop-blur-sm'
      style={{
        background: 'var(--surface-elevated)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--surface-shadow-sm)',
      }}
    >
      <div className='max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
            <Image
              style={{ color: 'var(--foreground)' }}
              priority={true}
              className='w-20 h-10 sm:w-28 sm:h-14 text-center flex-shrink-0'
              src={isDarkMode ? logoWhiteSvg : logoSvg}
              alt='Logo'
            />
            <p
              className='text-sm sm:text-lg md:text-xl font-bold truncate'
              style={{ color: 'var(--foreground)' }}
            >
              Timer Control
            </p>
            <span
              className='hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]'
              style={{
                color: 'var(--ring)',
                background:
                  'color-mix(in srgb, var(--ring) 10%, var(--surface-2) 90%)',
              }}
              title={`Active profile: ${activeProfileName}`}
            >
              Profile: {activeProfileName}
            </span>
          </div>
          <div className='flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:max-w-[460px]'>
            <input
              className='w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200'
              style={{
                color: 'var(--foreground)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--surface-shadow-sm)',
              }}
              placeholder='Search...'
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div className='flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0'>
            <div
              className='flex items-center gap-1.5 rounded-xl border p-1'
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface-2)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.45)',
              }}
            >
              {quickActions.map((action) => (
                <IconButton
                  key={action.key}
                  className='w-10 h-10 rounded-lg hover:bg-accent hover:text-accent-foreground'
                  style={{
                    color: action.destructive
                      ? 'var(--destructive)'
                        : 'var(--icon)',
                      background: 'transparent',
                  }}
                  icon={action.icon}
                  tooltip={action.label}
                  tooltipPosition='bottom'
                  onClick={action.onClick}
                />
              ))}
            </div>

            <div className='relative' ref={menuRef}>
              <IconButton
                className='w-10 h-10 rounded-xl border hover:bg-accent hover:text-accent-foreground'
                style={{
                  color: 'var(--icon)',
                  borderColor: 'var(--border)',
                  background: 'var(--surface-2)',
                  boxShadow: 'var(--surface-shadow-sm)',
                }}
                icon={<FiMoreVertical size={20} />}
                tooltip='More actions'
                tooltipPosition='bottom'
                aria-label='More actions'
                aria-expanded={isMenuOpen}
                aria-haspopup='menu'
                onClick={() => setIsMenuOpen((prev) => !prev)}
              />

              {isMenuOpen ? (
                <div
                  role='menu'
                  className='absolute right-0 mt-2 w-56 rounded-xl shadow-lg border py-2 z-30'
                  style={{
                    background: 'var(--surface-1)',
                    borderColor: 'var(--border)',
                    boxShadow: 'var(--surface-shadow)',
                  }}
                >
                  {menuActions.map((action) => (
                    <button
                      key={action.key}
                      type='button'
                      role='menuitem'
                      className={cn(
                        'w-full px-3 py-2.5 text-sm flex items-center gap-2 transition-colors',
                        'hover:bg-accent hover:text-accent-foreground'
                      )}
                      onClick={() => {
                        setIsMenuOpen(false)
                        action.onClick()
                      }}
                    >
                      <span style={{ color: 'var(--icon)' }}>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
