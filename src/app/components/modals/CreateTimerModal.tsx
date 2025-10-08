'use client'

import { useForm } from 'react-hook-form'
import { Timer } from '../../interfaces/time'
import Button from '../ui/Button'
import { createTimerApi } from '../../hooks/proPresenterApi'
import { useSettings } from '../../providers/settings'
import { useEffect } from 'react'

interface CreateTimerModalProps {
  open: boolean
  onClose: () => void
  onCreated: (timer: Timer) => void
}

interface TimerFormData {
  name: string
  duration: number
}

export default function CreateTimerModal({
  open,
  onClose,
  onCreated,
}: CreateTimerModalProps) {
  const { proPresenterUrl } = useSettings()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimerFormData>({
    defaultValues: {
      name: '',
      duration: 5,
    },
  })

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  if (!open) return null

  const onSubmit = async (data: TimerFormData) => {
    try {
      const resp = await createTimerApi(
        proPresenterUrl,
        data.duration,
        data.name
      )
      reset()
      onClose()
      onCreated(resp)
    } catch (e) {
      console.log(e)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      className='fixed inset-0 bg-black/30 flex items-center justify-center z-50'
    >
      <div className='bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200'>
        <h2 className='text-xl font-bold mb-4 text-gray-900'>
          Create New Timer
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='sm:col-span-4'>
            <label className='block mb-2 font-medium text-gray-600'>
              Timer Name
            </label>
            <input
              type='text'
              className='text-gray-600 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
              {...register('name', {
                required: 'Timer name is required',
              })}
            />
            {errors.name && (
              <p className='text-red-500 text-sm mt-1'>{errors.name.message}</p>
            )}
          </div>
          <div className='sm:col-span-4'>
            <label className='block mb-2 font-medium text-gray-600'>
              Duration (minutes)
            </label>
            <input
              type='number'
              min={1}
              className='text-gray-600 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
              {...register('duration', {
                required: 'Duration is required',
                min: {
                  value: 1,
                  message: 'Duration must be at least 1 minute',
                },
                valueAsNumber: true,
              })}
            />
            {errors.duration && (
              <p className='text-red-500 text-sm mt-1'>
                {errors.duration.message}
              </p>
            )}
          </div>
          <div className='mt-6 flex justify-start gap-2'>
            <Button
              className='mb-6'
              variant='primary'
              type='submit'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
            <Button
              variant='secondary'
              onClick={onClose}
              className='mb-6'
              type='button'
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
