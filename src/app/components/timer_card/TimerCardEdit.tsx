'use client'

import { useEffect, useState } from 'react'
import { formatSecondsToTime } from '@/lib/formatter'
import { Timer, TimerEditInput } from '../../interfaces/time'
import { MdCancel } from 'react-icons/md'
import { BiSave } from 'react-icons/bi'
import IconButton from '../ui/IconButton'
import { useForm } from 'react-hook-form'
import { useShared } from '@/app/providers/timer'
import {
  MIN_TIMER_SECONDS,
  getEditPrefillSeconds,
  parseDurationInput,
} from '@/lib/timerLogic'

interface TimerCardEditProps {
  timer: Timer
  isActive: boolean
  onCancel: () => void
  onSubmit: (timer: Timer, input: TimerEditInput) => Promise<boolean>
}

interface TimerFormData {
  name: string
  duration: string
}

export function TimerCardEdit({
  timer,
  isActive,
  onCancel,
  onSubmit,
}: TimerCardEditProps) {
  const { localTimer } = useShared()

  // Captured once when the form opens, so "changed" is measured against it
  const [prefillSeconds] = useState(() =>
    getEditPrefillSeconds({
      isActive,
      isOvertime: localTimer.overtime.isRunning,
      remainingSeconds: localTimer.totalSeconds,
      savedDuration: timer.countdown?.duration ?? 0,
    })
  )
  const prefillText = formatSecondsToTime(prefillSeconds)

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<TimerFormData>({
    defaultValues: {
      name: timer?.id.name ?? 'New Event',
      duration: prefillText,
    },
  })

  // A new timer form is ready for typing the name straight away
  const isNew = timer.time === 'new'
  useEffect(() => {
    if (isNew) setFocus('name')
  }, [isNew, setFocus])

  const submit = async (data: TimerFormData) => {
    await onSubmit(timer, {
      name: data.name,
      enteredSeconds:
        data.duration.trim() === prefillText
          ? prefillSeconds
          : parseDurationInput(data.duration),
      prefillSeconds,
    })
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
                      // An untouched field is always fine (rename only)
                      if (value.trim() === prefillText) return true
                      const totalSeconds = parseDurationInput(value)
                      if (totalSeconds === null) {
                        return 'Enter a duration as HH:MM:SS'
                      }
                      if (totalSeconds < MIN_TIMER_SECONDS) {
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
              disabled={isSubmitting}
              onClick={handleSubmit(submit)}
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
