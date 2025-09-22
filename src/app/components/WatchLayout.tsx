import Image from 'next/image'
import logoSvg from '../../../public/logo.svg'

export default function WatchLayoutWithProps({
  fullscreen,
  children,
  onExit,
  icon = '🔙',
  title = 'Event Timer',
  timeTracker = 'Time Left',
  description = '',
}: {
  fullscreen?: boolean
  children: React.ReactNode
  onExit: () => void
  icon?: string
  title?: string
  timeTracker?: string
  description?: string
}) {
  if (!fullscreen) return

  const timeupStyle = timeTracker === 'Time Up' ? 'text-red-600 animate-[blink_2s_infinite]' : ''

  return (
    <div className='h-screen w-screen bg-white flex flex-col'>
      {/* Exit button at top left */}
      <div className='absolute top-4 left-0 w-full flex items-center justify-between px-5'>
        {/* Exit button (left) */}
        <div
          className='flex items-center gap-3 cursor-pointer'
          onClick={onExit}
        >
          <div className='w-10 h-10 flex items-center justify-center text-white text-2xl font-bold'>
            {icon}
          </div>
          <div className='text-xl font-semibold text-gray-800 text-center flex-1'>
            {title}
          </div>
        </div>

        {/* Title (center) */}
        <div className={`text-6xl font-bold text-gray-800 text-center flex-1 ${timeupStyle}`}>
          {timeTracker}
        </div>

        {/* Logo (right) */}
        <div className='flex justify-end w-40 h-20'>
          <Image src={logoSvg} alt='Logo' />
        </div>
      </div>

      {/* Centered content */}
      <div className='flex flex-1 flex-col items-center justify-center p-5 text-center'>
        {children}

        <div className='text-6xl font-bold text-gray-600 mt-5 max-w-2xl leading-relaxed'>
          {description}
        </div>
      </div>
    </div>
  )
}
