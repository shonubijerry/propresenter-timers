'use client'

import { useState } from 'react'
import { Timer } from '../interfaces/time'
import Button from './ui/Button'
import { editTimerApi } from '../hooks/proPresenterApi'

interface CreateTimerModalProps {
  timer: Timer | null
  open: boolean
  onClose: () => void
  onUpdated: (timer: Timer) => void
}

export default function EditTimerModal({
  timer,
  open,
  onClose,
  onUpdated,
}: CreateTimerModalProps) {
  const [name, setName] = useState(timer?.id.name)
  const [duration, setDuration] = useState(timer?.countdown?.duration ?? 5)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    if (!name || duration <= 0) return
    setLoading(true)

    await editTimerApi(duration, name, timer?.id.uuid)
      .then((resp) => {
        setLoading(false)
        setName('')
        setDuration(5)
        onClose()
        onUpdated(resp)
      })
      .catch((e) => {
        console.log(e)
        setLoading(false)
      })
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLInputElement>) => {
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
        <h2 className='text-xl font-bold mb-4 text-gray-900'>Edit New Timer</h2>
        <div className='space-y-4'>
          <div className='sm:col-span-4'>
            <label className='block mb-2 font-medium text-gray-600'>
              Timer Name
            </label>
            <input
              type='text'
              className='text-gray-600 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
              value={name}
              onChange={(e) => setName(e.target.value)}
              name='name'
            />
          </div>
          <div className='sm:col-span-4'>
            <label className='block mb-2 font-medium text-gray-600'>
              Duration (minutes)
            </label>
            <input
              type='number'
              min={1}
              className='text-gray-600 w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none'
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>
        <div className='mt-6 flex justify-start gap-2'>
          <Button
            className='mb-6'
            variant='primary'
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update'}
          </Button>
          <Button variant='secondary' onClick={onClose} className='mb-6'>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
