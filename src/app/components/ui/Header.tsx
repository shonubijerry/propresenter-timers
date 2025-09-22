import { Dispatch, SetStateAction } from 'react'
import Button from './Button'
import Image from 'next/image'
import logoSvg from '../../../../public/logo.svg'

export function Header({
  setIsModalOpen,
}: {
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <div className='bg-white/70 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10'>
      <div className='max-w-6xl mx-auto px-6 py-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Image className='w-30 h-15 text-center flex-1' src={logoSvg} alt='Logo' />
            <p className='text-2xl font-bold flex text-centre text-slate-600 mt-1'>
              Propresenter Timer Control
            </p>
          </div>
          <Button
            className='rounded-xl font-medium shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5'
            variant='primary'
            onClick={() => setIsModalOpen(true)}
          >
            <span className='mr-2'>+</span>
            Create Timer
          </Button>
        </div>
      </div>
    </div>
  )
}
