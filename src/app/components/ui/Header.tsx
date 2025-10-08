import { Dispatch, SetStateAction } from 'react'
import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import { DiAptana } from 'react-icons/di'
import { TbLayoutGridAdd } from 'react-icons/tb'
import { LuTimerReset } from 'react-icons/lu'
import { TimerActions } from '@/app/hooks/timer'
import { AiOutlineFullscreenExit } from 'react-icons/ai'
import IconButton from './IconButton'

export function Header({
  setIsModalOpen,
  openSettings,
  onExitFullscreen,
  resetAllTimers,
}: {
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
  openSettings: () => void
  onExitFullscreen: () => void
  resetAllTimers: (action: TimerActions) => Promise<void>
}) {
  return (
    <div className='bg-white/70 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10'>
      <div className='max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-6'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
            <Image
              priority={true}
              className='w-20 h-10 sm:w-30 sm:h-15 text-center flex-shrink-0'
              src={logoSvg}
              alt='Logo'
            />
            <p className='text-sm sm:text-xl md:text-2xl font-bold text-slate-600 mt-1 truncate'>
              AGC Timer Control
            </p>
          </div>
          <div className='flex items-center gap-2 sm:gap-4 flex-shrink-0'>
            <IconButton
              variant='primary'
              icon={<TbLayoutGridAdd size={40} />}
              tooltip='Create Timer'
              tooltipPosition='bottom'
              onClick={() => setIsModalOpen(true)}
            />
            <IconButton
              variant='primary'
              icon={<AiOutlineFullscreenExit size={40} />}
              tooltip='Close External Screen'
              tooltipPosition='bottom'
              onClick={onExitFullscreen}
            />
            <IconButton
              variant='primary'
              icon={<LuTimerReset size={40} />}
              tooltip='Reset all timers'
              tooltipPosition='bottom'
              onClick={() => resetAllTimers('reset')}
            />
            <IconButton
              variant='primary'
              icon={<DiAptana size={40} />}
              tooltip='Settings'
              tooltipPosition='bottom'
              onClick={openSettings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
