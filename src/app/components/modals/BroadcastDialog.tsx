'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Button from '../ui/Button'
import { useShared } from '../../providers/timer'

const MAX_BROADCAST_CHARACTERS = 100

interface BroadcastDialogProps {
  open: boolean
  onClose: () => void
}

export default function BroadcastDialog({
  open,
  onClose,
}: BroadcastDialogProps) {
  const { broadcastMessage, setBroadcastMessage, dismissBroadcastMessage } =
    useShared()

  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setMessage(broadcastMessage)
  }, [open, broadcastMessage])

  const trimmedMessage = useMemo(() => message.trim(), [message])
  const characterCount = message.length

  const handleBroadcast = () => {
    if (!trimmedMessage) return
    setBroadcastMessage(trimmedMessage)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title='Broadcast Message' size='md'>
      <div className='space-y-4'>
        <div>
          <label className='block mb-2 font-medium'>Message</label>
          <textarea
            className='w-full p-3 border rounded-lg bg-background border-input placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background outline-none resize-none'
            placeholder='Type a message for second and feedback screens...'
            rows={4}
            maxLength={MAX_BROADCAST_CHARACTERS}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className='text-sm text-muted-foreground mt-2'>
            {characterCount}/{MAX_BROADCAST_CHARACTERS}
          </p>
        </div>

        {broadcastMessage ? (
          <p className='text-sm text-muted-foreground'>
            A broadcast is currently active and visible on external screens.
          </p>
        ) : null}

        <div className='flex items-center gap-2'>
          <Button
            variant='primary'
            onClick={handleBroadcast}
            disabled={!trimmedMessage}
          >
            Broadcast
          </Button>
          <Button
            variant='secondary'
            onClick={onClose}
          >
            Cancel
          </Button>
          {broadcastMessage ? (
            <Button
              variant='outline'
              onClick={() => {
                dismissBroadcastMessage()
                onClose()
              }}
            >
              Dismiss Active
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
