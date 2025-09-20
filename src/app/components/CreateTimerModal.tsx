'use client'

import { useState } from 'react'
import { Timer } from '../interfaces/time'
import Button from './ui/Button'

interface CreateTimerModalProps {
  open: boolean
  onClose: () => void
  onCreated: (timer: Timer) => void // callback to refresh timers after creation
}

export default function CreateTimerModal({
  open,
  onClose,
  onCreated,
}: CreateTimerModalProps) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(5) // default 5 minutes
  const [loading, setLoading] = useState(false)

  if (!open) return null // don’t render if closed

  const handleSubmit = async () => {
    if (!name || duration <= 0) return
    setLoading(true)

    const resp = await fetch('/api/timers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allows_overrun: true,
        countdown: { duration: duration * 60 },
        name,
      }),
    })

    setLoading(false)
    setName('')
    setDuration(5)
    onClose()
    onCreated(await resp.json())
  }

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50'>
      <div className='bg-black rounded-2xl shadow-lg p-6 w-full max-w-md'>
        <h2 className='text-xl font-bold mb-4'>Create New Timer</h2>
        <div className='space-y-4'>
          <input
            type='text'
            placeholder='Timer Name'
            className='w-full p-2 border rounded'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type='number'
            min={1}
            placeholder='Duration (minutes)'
            className='w-full p-2 border rounded'
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <div className='mt-6 flex justify-start gap-2'>
          <Button
            className='mb-6'
            variant='primary'
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
          <Button variant='secondary' onClick={onClose} className='mb-6'>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
