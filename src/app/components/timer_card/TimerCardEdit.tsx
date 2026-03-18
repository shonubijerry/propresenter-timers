'use client'

import { formatSecondsToTime } from '@/lib/formatter'
import { Timer } from '../../interfaces/time'
import { MdCancel } from 'react-icons/md'
import { BiSave } from 'react-icons/bi'
import IconButton from '../ui/IconButton'
import { useForm } from 'react-hook-form'
import { toastError, toastSuccess } from '@/lib/toastUtils'
import { useTimersApi } from '@/app/hooks/useTimerApi'
import { useShared } from '@/app/providers/timer'
import { randomInt } from 'crypto'

interface TimerCardEditProps {
  timer: Timer
  isActive: boolean
  onCancel: () => void
  onSave: (updatedTimer: Timer) => void
}

interface TimerFormData {
  name: string
  duration: string
}

export function TimerCardEdit({
  timer,
  isActive,
  onCancel,
  onSave,
}: TimerCardEditProps) {
  const { createTimer, setTimerUpdateOperation } = useTimersApi()
    const { localTimer } = useShared()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TimerFormData>({
    defaultValues: {
      name: timer?.id.name ?? 'New Event',
      duration: formatSecondsToTime(
        isActive ? localTimer.totalSeconds : (timer?.countdown?.duration ?? 5)
      ),
    },
  })

  const onSubmit = async (data: TimerFormData) => {

    try {
    if (!data.name.trim()) {
      data.name = `Timer ${Math.floor(Math.random() * 1000)}`
    }
      const [hours = 0, minutes = 0, seconds = 0] = data.duration
        .split(':')
        .map(Number)

      let totalSeconds = hours * 3600 + minutes * 60 + seconds

      if (totalSeconds < 60) {
        toastError('Duration must be at least 1 minute')
        return
      }

      if (isActive) {
        totalSeconds = localTimer.totalSeconds
      }

      if (timer.time === 'new') {
        const resp = await createTimer(totalSeconds, data.name)
        onSave({
          ...resp,
          remainingSeconds: totalSeconds,
          state: (isActive ? 'running' : 'stopped') as Timer['state'],
          time: formatSecondsToTime(totalSeconds),
        })
        toastSuccess('Timer successfully created')
        return
      }

      await setTimerUpdateOperation(
        totalSeconds,
        data.name,
        isActive ? 'start' : 'reset',
        timer?.id.uuid
      )

      const updatedTimer = {
        ...timer,
        id: {
          ...timer.id,
          name: data.name,
        },
        countdown: {
          ...timer.countdown,
          duration: totalSeconds,
        },
        remainingSeconds: totalSeconds,
        state: (isActive ? 'running' : 'stopped') as Timer['state'],
      }

      onSave(updatedTimer)
      toastSuccess('Timer updated successfully')
    } catch (e) {
      console.error('Error updating timer:', e)
      toastError('Failed to update timer')
    }
  }

  return (
    <div
      className='rounded-2xl p-6 shadow-sm border transition-all duration-300 hover:shadow-lg'
      style={{
        background: 'var(--card)',
        border: '1.5px solid var(--border)',
      }}
    >
      {/* Timer Header */}
      <div className='flex items-start justify-between mb-4'>
        <div className='flex-1'>
          <div className='mb-2'>
            <input
              placeholder='Enter timer name'
              type='text'
              className='w-full text-lg font-semibold mb-1 p-2 rounded'
              style={{
                border: '1.5px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--card-foreground)',
              }}
              {...register('name')}
            />
            {errors.name && (
              <span className='text-xs text-red-500'>
                {errors.name.message}
              </span>
            )}
          </div>
          {timer.countdown && (
            <div className='flex items-center gap-2 flex-wrap'>
              <span
                className='text-sm'
                style={{ color: 'var(--muted-foreground)' }}
              >
                Duration:
              </span>
              <div className='flex-1 min-w-[150px]'>
                <input
                  type='datetime'
                  step='1'
                  className='w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
                  style={{
                    border: '1.5px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                  }}
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
                  <span className='text-xs text-red-500 block mt-1'>
                    {errors.duration.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {timer.countdown ? (
        <div className='space-y-4'>
          {/* Action Buttons */}
          <div className='flex gap-8 flex-wrap'>
            <IconButton
              style={{ color: 'var(--muted-foreground)' }}
              icon={<MdCancel size={30} />}
              tooltip='Cancel Edit'
              tooltipPosition='top'
              onClick={onCancel}
            />
            <IconButton
              style={{ color: 'var(--ring)' }}
              icon={<BiSave size={30} />}
              tooltip='Save Changes'
              tooltipPosition='top'
              onClick={handleSubmit(onSubmit)}
            />
          </div>
        </div>
      ) : (
        <div className='text-center py-6'>
          <p
            className='text-sm font-medium'
            style={{ color: 'var(--muted-foreground)' }}
          >
            Timer Config Not Supported
          </p>
        </div>
      )}
    </div>
  )
}
