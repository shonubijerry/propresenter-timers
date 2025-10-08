import { Dispatch, SetStateAction } from 'react'
import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import { DiAptana } from 'react-icons/di'
import { TbLayoutGridAdd } from 'react-icons/tb'
import { LuTimerReset } from 'react-icons/lu'
import { TimerActions } from '@/app/hooks/timer'
import { AiOutlineFullscreenExit } from 'react-icons/ai'

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
            <button className='has-tooltip'>
              <TbLayoutGridAdd
                size={28}
                onClick={() => setIsModalOpen(true)}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700 sm:w-10 sm:h-10'
              />
              <span className='tooltip tooltip-bottom hidden sm:inline'>Create Timer</span>
            </button>
            <button className='has-tooltip'>
              <AiOutlineFullscreenExit
                size={28}
                onClick={onExitFullscreen}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700 sm:w-10 sm:h-10'
              />
              <span className='tooltip tooltip-bottom hidden sm:inline'>Close External Screen</span>
            </button>
            <button className='has-tooltip'>
              <LuTimerReset
                size={28}
                onClick={() => resetAllTimers('reset')}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700 sm:w-10 sm:h-10'
              />
              <span className='tooltip tooltip-bottom hidden sm:inline'>Reset all timers</span>
            </button>
            <button className='has-tooltip'>
              <DiAptana
                size={28}
                onClick={openSettings}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700 sm:w-10 sm:h-10'
              />
              <span className='tooltip tooltip-bottom hidden sm:inline'>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
