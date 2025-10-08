import Button from './ui/IconButton'

export default function EmptyTimer({
  openSettings,
}: {
  openSettings: () => void
}) {
  return (
    <>
      <div className='text-center py-16'>
        <div className='bg-white rounded-2xl p-12 shadow-sm border border-slate-200/50'>
          <h3 className='text-xl font-semibold text-slate-900 mb-2'>
            No timers Listed?
          </h3>
          <p className='text-slate-600 mb-6'>
            Check that your settings are correct
          </p>
          <Button
            className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium'
            variant='primary'
            onClick={openSettings}
          >
            Settings
          </Button>
        </div>
      </div>
    </>
  )
}
