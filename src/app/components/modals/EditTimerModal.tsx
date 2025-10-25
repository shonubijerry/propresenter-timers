'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Timer } from '../../interfaces/time'
import Button from '../ui/Button'
import { editTimerApi } from '../../hooks/proPresenterApi'
import { useSettings } from '../../providers/settings'
import Modal from './Modal'
import { formatSecondsToTime } from '@/lib/formatter'
import toast from 'react-simple-toasts'

interface CreateTimerModalProps {
  timer: Timer | null
  open: boolean
  onClose: () => void
  onUpdated: (timer: Timer) => void
}

interface TimerFormData {
  name: string
  duration: string
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
      duration: formatSecondsToTime(timer?.countdown?.duration ?? 5),
    },
  })

  // Reset form when timer changes
  useEffect(() => {
    if (timer) {
      reset({
        name: timer.id.name,
        duration: timer.countdown?.duration
          ? formatSecondsToTime(timer.countdown?.duration)
          : '00:05:00',
      })
    }
  }, [timer, reset])

  if (!open) return null

  const onSubmit = async (data: TimerFormData) => {
    try {
      const [hours = 0, minutes = 0, seconds = 0] = data.duration
        .split(':')
        .map(Number)

      const totalSeconds = hours * 3600 + minutes * 60 + seconds

      if (totalSeconds < 60) {
        toast('Duration must be at least 1 minute')
        return
      }

      const resp = await editTimerApi(
        proPresenterUrl,
        totalSeconds,
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

  return (
    <Modal open={open} onClose={onClose} title='Edit Timer'>
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
            Duration (hh:mm:ss)
          </label>
          <input
            type='time'
            step='1'
            className='text-gray-600 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
            {...register('duration', {
              required: 'Duration is required',
              validate: (value) => {
                const [hours = 0, minutes = 0, seconds = 0] = value
                  .split(':')
                  .map(Number)
                const totalSeconds = hours * 3600 + minutes * 60 + seconds
                if (totalSeconds < 60) {
                  return 'Duration must be at least 1 minute'
                }
                return true
              },
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
    </Modal>
  )
}
