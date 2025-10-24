'use client'

import { useForm } from 'react-hook-form'
import { Timer } from '../../interfaces/time'
import Button from '../ui/Button'
import Modal from './Modal'
import { createTimerApi } from '../../hooks/proPresenterApi'
import { useSettings } from '../../providers/settings'
import toast from 'react-simple-toasts'

interface CreateTimerModalProps {
  open: boolean
  onClose: () => void
  onCreated: (timer: Timer) => void
}

interface TimerFormData {
  name: string
  duration: string // keep as string for input binding
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
      duration: '00:05:00', // default 5 minutes
    },
  })

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

      const resp = await createTimerApi(
        proPresenterUrl,
        totalSeconds,
        data.name
      )

      reset()
      onClose()
      onCreated(resp)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title='Create New Timer'>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        {/* Timer Name */}
        <div className='sm:col-span-4'>
          <label className='block mb-2 font-medium text-gray-600'>
            Timer Name
          </label>
          <input
            type='text'
            className='text-gray-600 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
            {...register('name', { required: 'Timer name is required' })}
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

        {/* Buttons */}
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
    </Modal>
  )
}
