import { cn } from '@/lib/cn'
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost'
  icon: ReactNode
  tooltip?: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
}

export default function IconButton({
  icon,
  tooltip,
  tooltipPosition = 'top',
  variant = 'ghost',
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 active:brightness-110 duration-200'

  const variants = {
    primary: 'text-blue-600 hover:text-blue-700 focus:ring-blue-500',
    success: 'text-green-600 hover:text-green-800 focus:ring-green-500',
    warning: 'text-yellow-600 hover:text-yellow-800 focus:ring-yellow-500',
    error: 'text-red-600 hover:text-red-800 focus:ring-red-500',
    secondary:
      'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400',
    ghost:
      'bg-white-100 text-white-900 hover:bg-white-200 focus:ring-white-400',
    dark:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-400',
  }

  const tooltipPositions = {
    top: 'tooltip-top',
    bottom: 'tooltip-bottom',
    left: 'tooltip-left',
    right: 'tooltip-right',
  }

  const cursor = disabled ? 'cursor-not-allowed' : 'cursor-pointer'

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        cursor,
        tooltip && 'has-tooltip',
        disabled && 'hover:-translate-y-0',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {tooltip && (
        <span className={cn('tooltip', tooltipPositions[tooltipPosition])}>
          {tooltip}
        </span>
      )}
      {icon}
    </button>
  )
}
