import { Dispatch, SetStateAction } from 'react'
import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import { DiAptana } from 'react-icons/di'
import { TbLayoutGridAdd } from 'react-icons/tb'
import { LuTimerReset } from 'react-icons/lu'
import { TimerActions } from '@/app/hooks/timer'

export function Header({
  setIsModalOpen,
  openSettings,
  resetAllTimers,
}: {
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
  openSettings: () => void
  resetAllTimers: (action: TimerActions) => Promise<void>
}) {
  return (
    <div className='bg-white/70 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10'>
      <div className='max-w-6xl mx-auto px-6 py-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Image
              priority={true}
              className='w-30 h-15 text-center flex-1'
              src={logoSvg}
              alt='Logo'
            />
            <p className='text-2xl font-bold flex text-centre text-slate-600 mt-1'>
              AGC Timer Control
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <button className='has-tooltip'>
              <TbLayoutGridAdd
                size={40}
                onClick={() => setIsModalOpen(true)}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700'
              />
              <span className='tooltip tooltip-bottom'>Create Timer</span>
            </button>
            <button className='has-tooltip'>
              <LuTimerReset
                size={40}
                onClick={() => resetAllTimers('reset')}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700'
              />
              <span className='tooltip tooltip-bottom'>Stop all timer</span>
            </button>
            <button className='has-tooltip'>
              <DiAptana
                size={40}
                onClick={openSettings}
                className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700'
              />
              <span className='tooltip tooltip-bottom'>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
