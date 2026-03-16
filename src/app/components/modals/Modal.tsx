import { useEffect, ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  actions?: ReactNode
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export default function Modal({
  open,
  onClose,
  children,
  title,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = false,
  actions,
}: ModalProps) {
  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeOnEscape, onClose])

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      className='fixed inset-0 flex items-center justify-center z-50'
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--card-foreground)',
          borderColor: 'var(--border)'
        }}
        className={`rounded-2xl shadow-xl w-[92vw] ${sizeClasses[size]} max-h-[90vh] border flex flex-col`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className='flex items-center justify-between p-6 pb-0'>
            {title && (
              <h2 style={{ color: 'var(--foreground)' }} className='text-xl font-bold'>{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  color: 'var(--muted-foreground)',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
                aria-label='Close modal'
              >
                <svg
                  className='w-6 h-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className='flex-1 p-6 overflow-y-auto'>
          {children}
        </div>
      </div>
    </div>
  )
}
