import Button from './ui/Button'

export default function EmptyTimer({
  openSettings,
}: {
  openSettings: () => void
}) {
  return (
    <>
      <div className='text-center py-16'>
        <div
          className='rounded-2xl p-12 shadow-sm border border-slate-200/50'
          style={{
            background: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          <h3 className='text-xl font-semibold mb-2' style={{
            color: 'var(--foreground)',
          }}>
            No timers Listed?
          </h3>
          <p className='mb-6'>
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
