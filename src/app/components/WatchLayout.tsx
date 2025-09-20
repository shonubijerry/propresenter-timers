export default function WatchLayoutWithProps({
  fullscreen,
  children,
  onExit,
  icon = '🔙',
  title = 'Event Timer',
  description = '',
}: {
  fullscreen: boolean
  children: React.ReactNode
  onExit: () => void
  icon?: string
  title?: string
  description?: string
}) {
  if (!fullscreen) return

  return (
    <div className='h-screen w-screen bg-white flex flex-col items-center justify-center p-5'>
      <div
        className='absolute top-5 left-5 flex items-center gap-3 cursor-pointer'
        onClick={onExit}
      >
        <div className='w-10 h-10 flex items-center justify-center text-white text-2xl font-bold'>
          {icon}
        </div>
        <div className='text-xl font-semibold text-gray-800'>{title}</div>
      </div>

      <div className='text-center'>
        {children}

        <div className='text-lg text-center text-gray-600 mt-5 max-w-2xl leading-relaxed'>
          {description}
        </div>
      </div>
    </div>
  )
}
