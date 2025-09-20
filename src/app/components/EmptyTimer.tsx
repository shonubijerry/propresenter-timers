import Image from 'next/image'
import Button from './ui/Button'
import timeSvg from '../../../public/time.svg'
import { Dispatch, SetStateAction } from 'react'

export default function EmptyTimer({
  setIsModalOpen,
}: {
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <>
      <div className='text-center py-16'>
        <div className='bg-white rounded-2xl p-12 shadow-sm border border-slate-200/50'>
          <div className='w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center'>
            <Image
              className='w-10 h-10 text-blue-600'
              src={timeSvg}
              alt='Start'
            />
          </div>
          <h3 className='text-xl font-semibold text-slate-900 mb-2'>
            No timers yet
          </h3>
          <p className='text-slate-600 mb-6'>
            Create your first timer to get started with managing your
            presentations
          </p>
          <Button
            className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium'
            variant='primary'
            onClick={() => setIsModalOpen(true)}
          >
            Create Your First Timer
          </Button>
        </div>
      </div>
    </>
  )
}
