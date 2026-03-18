import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import { DiAptana } from 'react-icons/di'
import { LuTimerReset } from 'react-icons/lu'
import { TimerActions } from '@/app/hooks/timer'
import { AiOutlineFullscreenExit } from 'react-icons/ai'
import IconButton from './IconButton'
import { RiRefreshLine } from 'react-icons/ri'
import { FiInfo } from 'react-icons/fi'
import { MdCampaign } from 'react-icons/md'

export function Header({
  openSettings,
  onExitFullscreen,
  resetAllTimers,
  refreshTimers,
  onSearch,
  toggleAboutModal,
  openBroadcastModal,
}: {
  openSettings: () => void
  onExitFullscreen: () => void
  resetAllTimers: (action: TimerActions) => Promise<void>
  refreshTimers: () => void
  onSearch: (term: string) => void
  toggleAboutModal: () => void
  openBroadcastModal: () => void
}) {
  return (
    <div
      className='sticky top-0 z-10 backdrop-blur-sm'
      style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className='max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-6'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
            <Image
              style={{ color: 'var(--foreground)' }}
              priority={true}
              className='w-20 h-10 sm:w-30 sm:h-15 text-center flex-shrink-0'
              src={logoSvg}
              alt='Logo'
            />
            <p
              className='text-sm sm:text-xl md:text-2xl font-bold mt-1 truncate'
              style={{ color: 'var(--foreground)' }}
            >
              AGC Timer Control
            </p>
          </div>
          <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
            <input
              className='w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200'
              style={{
                color: 'var(--foreground)',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                boxShadow: 'none',
              }}
              placeholder='Search...'
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2 sm:gap-4 flex-shrink-0'>
            <IconButton
              style={{ color: 'var(--icon)' }}
              icon={<RiRefreshLine size={40} />}
              tooltip='Refresh'
              tooltipPosition='bottom'
              onClick={refreshTimers}
            />
            <IconButton
              style={{ color: 'var(--icon)' }}
              icon={<AiOutlineFullscreenExit size={40} />}
              tooltip='Close External Screen'
              tooltipPosition='bottom'
              onClick={onExitFullscreen}
            />
            <IconButton
              style={{ color: 'var(--icon)' }}
              icon={<LuTimerReset size={40} />}
              tooltip='Reset all timers'
              tooltipPosition='bottom'
              onClick={() => resetAllTimers('reset')}
            />
            <IconButton
              style={{ color: 'var(--icon)' }}
              icon={<DiAptana size={40} />}
              tooltip='Settings'
              tooltipPosition='bottom'
              onClick={openSettings}
            />
            <IconButton
              style={{ color: 'var(--icon)' }}
              icon={<MdCampaign size={40} />}
              tooltip='Broadcast Message'
              tooltipPosition='bottom'
              onClick={openBroadcastModal}
            />
            <IconButton
              style={{ color: 'var(--icon)' }}
              icon={<FiInfo size={40} />}
              tooltip='About'
              tooltipPosition='bottom'
              onClick={toggleAboutModal}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
