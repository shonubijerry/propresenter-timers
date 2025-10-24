import { useEffect } from 'react'
import { AppSettings, useSettings } from '../../providers/settings'
import { useForm } from 'react-hook-form'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import Modal from './Modal'

type Prop = {
  refreshTimers: () => void
}

export default function SettingsDialog({ refreshTimers }: Prop) {
  const { settings, updateSettings, isDialogOpen, closeSettingsDialog } =
    useSettings()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: settings,
    mode: 'onChange',
  })

  // Reset form when settings change or dialog opens
  useEffect(() => {
    reset(settings)
  }, [settings, isDialogOpen, reset])

  const onSubmit = (data: AppSettings) => {
    updateSettings(data)
    refreshTimers()
    closeSettingsDialog()
  }

  if (!isDialogOpen) return null

  return (
    <Modal open={isDialogOpen} onClose={closeSettingsDialog} title='Settings'>
      <form onSubmit={handleSubmit(onSubmit)} className='bg-white'>
        <div className='space-y-4 text-gray-600'>
          <Alert
            type='info'
            title='Action needed'
            message={
              <>
                You need to go in - <br />
                ProPresenter =&gt; Settings =&gt; Network
                <br /> Copy the IP Address and Port into this form
              </>
            }
          ></Alert>
          <div>
            <label className='block mb-1 font-medium'>ProPresenter URL</label>
            <input
              placeholder='http://127.0.0.1'
              type='url'
              {...register('address', {
                required: 'Propresenter url is required',
                pattern: {
                  value:
                    /^http:\/\/(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
                  message: 'URL must start with http:// followed by IP address',
                },
              })}
              className='w-full p-2 border rounded-lg'
            />
            {errors.address && (
              <p className='text-sm text-red-500'>{errors.address.message}</p>
            )}
          </div>

          <div>
            <label className='block mb-1 font-medium'>ProPresenter Port</label>
            <input
              type='number'
              {...register('port', {
                required: 'Port is required',
                min: { value: 1, message: 'Port must be > 0' },
                max: { value: 65535, message: 'Port must be ≤ 65535' },
              })}
              className='w-full p-2 border rounded-lg'
            />
            {errors.port && (
              <p className='text-sm text-red-500'>{errors.port.message}</p>
            )}
          </div>
        </div>
        <div className='mt-6 flex justify-start gap-2'>
          <Button variant='primary' type='submit' className='mb-6'>
            Save
          </Button>
          <Button
            variant='secondary'
            onClick={closeSettingsDialog}
            className='mb-6'
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
