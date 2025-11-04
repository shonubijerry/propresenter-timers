import React, { ReactNode } from 'react'
import { BsCheckCircle } from 'react-icons/bs'
import {
  MdInfoOutline,
  MdErrorOutline,
  MdOutlineWarningAmber,
} from 'react-icons/md'

// Define styles and icons for different alert types
const alertStyles = {
  success: {
    styles: {
      background: 'rgba(34, 197, 94, 0.1)',
      color: 'var(--foreground)',
      borderColor: '#22c55e',
      iconColor: '#22c55e',
    },
    icon: <BsCheckCircle className='w-5 h-5' />,
  },
  warning: {
    styles: {
      background: 'rgba(234, 179, 8, 0.1)',
      color: 'var(--foreground)',
      borderColor: '#eab308',
      iconColor: '#eab308',
    },
    icon: <MdOutlineWarningAmber className='w-5 h-5' />,
  },
  error: {
    styles: {
      background: 'rgba(220, 38, 38, 0.1)',
      color: 'var(--foreground)',
      borderColor: 'var(--destructive)',
      iconColor: 'var(--destructive)',
    },
    icon: <MdErrorOutline className='w-5 h-5' />,
  },
  info: {
    styles: {
      background: 'rgba(59, 131, 246, 0.216)',
      color: 'var(--foreground)',
      borderColor: 'var(--primary)',
      iconColor: 'var(--primary)',
    },
    icon: <MdInfoOutline className='w-5 h-5' />,
  },
}

type Props = {
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: ReactNode
  onClose?: () => void
}

export default function Alert({ type, title, message, onClose }: Props) {
  const styles = alertStyles[type] || alertStyles.info

  return (
    <div
      role='alert'
      className='relative p-4 mb-4 border-l-4 rounded-lg shadow-md transition-opacity duration-300 ease-out'
      style={{
        background: styles.styles.background,
        color: styles.styles.color,
        borderColor: styles.styles.borderColor,
      }}
    >
      <div className='flex items-start'>
        {/* Icon */}
        <div
          className='flex-shrink-0 pt-0.5'
          style={{ color: styles.styles.iconColor }}
        >
          {styles.icon}
        </div>

        {/* Content */}
        <div className='ml-3 flex-1'>
          <p className='text-sm font-semibold leading-5'>{title}</p>
          <p className='mt-1 text-sm'>{message}</p>
        </div>

        {/* Close Button */}
        {onClose && (
          <div className='ml-auto pl-3'>
            <button
              onClick={onClose}
              type='button'
              className='p-1 -m-1 rounded-md transition-colors duration-150'
              style={{
                color: styles.styles.iconColor,
              }}
              aria-label='Close'
            >
              <MdErrorOutline className='w-4 h-4' />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
