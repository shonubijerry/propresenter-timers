import { Dispatch, SetStateAction } from 'react'
import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'
import { DiAptana } from 'react-icons/di'
import { TbLayoutGridAdd } from 'react-icons/tb'

export function Header({
  setIsModalOpen,
  openSettings,
}: {
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
  openSettings: () => void
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
            <TbLayoutGridAdd
              size={40}
              onClick={() => setIsModalOpen(true)}
              className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700'
            />
            <DiAptana
              size={40}
              onClick={openSettings}
              className='cursor-pointer text-blue-600 duration-200 hover:text-blue-700'
            />
          </div>
        </div>
      </div>
    </div>
  )
}
