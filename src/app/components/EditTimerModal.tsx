'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Timer } from '../interfaces/time'
import Button from './ui/Button'
import { editTimerApi } from '../hooks/proPresenterApi'
import { useSettings } from '../providers/settings'

interface CreateTimerModalProps {
  timer: Timer | null
  open: boolean
  onClose: () => void
  onUpdated: (timer: Timer) => void
}

interface TimerFormData {
  name: string
  duration: number
}

export default function EditTimerModal({
  timer,
  open,
  onClose,
  onUpdated,
}: CreateTimerModalProps) {
  const { proPresenterUrl } = useSettings()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimerFormData>({
    defaultValues: {
      name: timer?.id.name ?? '',
      duration: timer?.countdown?.duration ?? 5,
    },
  })

  // Reset form when timer changes
  useEffect(() => {
    if (timer) {
      reset({
        name: timer.id.name,
        duration: timer.countdown?.duration
          ? timer.countdown?.duration / 60
          : 5,
      })
    }
  }, [timer, reset])

  if (!open) return null

  const onSubmit = async (data: TimerFormData) => {
    try {
      const resp = await editTimerApi(
        proPresenterUrl,
        data.duration,
        data.name,
        timer?.id.uuid
      )
      reset()
      onClose()
      onUpdated(resp)
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
        <h2 className='text-xl font-bold mb-4 text-gray-900'>Edit Timer</h2>
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
              {isSubmitting ? 'Updating...' : 'Update'}
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
