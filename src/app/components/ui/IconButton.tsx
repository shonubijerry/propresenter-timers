import { cn } from '@/lib/cn'
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  tooltip?: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
}

export default function IconButton({
  icon,
  tooltip,
  tooltipPosition = 'top',
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 active:brightness-110 duration-200'

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
