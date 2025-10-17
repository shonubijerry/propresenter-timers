import React, { ReactNode } from 'react'
import { BsCheckCircle } from 'react-icons/bs'
import {
  MdInfoOutline,
  MdErrorOutline,
  MdOutlineWarningAmber,
} from 'react-icons/md'

// Define base colors and icons for different alert types
const alertStyles = {
  success: {
    base: 'bg-green-50 text-green-800 border-green-200',
    icon: <BsCheckCircle className='w-5 h-5 text-green-500' />,
    button: 'text-green-600 hover:bg-green-100',
  },
  warning: {
    base: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    icon: <MdOutlineWarningAmber className='w-5 h-5 text-yellow-500' />,
    button: 'text-yellow-600 hover:bg-yellow-100',
  },
  error: {
    base: 'bg-red-50 text-red-800 border-red-200',
    icon: <MdErrorOutline className='w-5 h-5 text-red-500' />,
    button: 'text-red-600 hover:bg-red-100',
  },
  info: {
    base: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: <MdInfoOutline className='w-5 h-5 text-blue-500' />,
    button: 'text-blue-600 hover:bg-blue-100',
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
      className={`relative p-4 mb-4 border-l-4 rounded-lg shadow-md transition-opacity duration-300 ease-out ${styles.base}`}
    >
      <div className='flex items-start'>
        {/* Icon */}
        <div className='flex-shrink-0 pt-0.5'>{styles.icon}</div>

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
              className={`p-1 -m-1 rounded-md transition-colors duration-150 ${styles.button}`}
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
