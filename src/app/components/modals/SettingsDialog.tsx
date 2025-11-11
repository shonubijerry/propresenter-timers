import { useEffect, useState } from 'react'
import { AppSettings, useSettings } from '../../providers/settings'
import { useForm } from 'react-hook-form'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import Modal from './Modal'
import { RadioGroup } from '@headlessui/react'
import { cn } from '@/lib/cn'
import { fetchJson } from '@/app/hooks/proPresenterApi'

export default function SettingsDialog() {
  const { settings, updateSettings, isDialogOpen, closeSettingsDialog } =
    useSettings()
  const [connectionOk, setConnectionOk] = useState<boolean>(false)

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

  // Connection test effect
  useEffect(() => {
    if (!isDialogOpen) return
    setConnectionOk(false)
    if (!settings?.address || !settings?.port) return
    fetchJson(
      `${settings.address}:${settings.port}/version`,
      undefined,
      'Connection failed',
      2000
    )
      .then(() => setConnectionOk(true))
      .catch((e) => {
        const errorMsg = e instanceof Error ? e.message : 'Connection failed'
        console.error(errorMsg)
        setConnectionOk(false)
      })
  }, [settings?.address, settings?.port, isDialogOpen])

  const onSubmit = async (data: AppSettings) => {
    await updateSettings(data)
    closeSettingsDialog()
    if (window !== undefined) {
      window.location.reload()
    }
  }

  if (!isDialogOpen) return null

  return (
    <Modal open={isDialogOpen} onClose={closeSettingsDialog} title='Settings'>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='space-y-6'>
          {!connectionOk && (
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
            />
          )}
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
              className='w-full p-2 border rounded-lg bg-background border-input placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background outline-none'
            />
            {errors.address && (
              <p className='text-sm text-destructive'>
                {errors.address.message}
              </p>
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
              className='w-full p-2 border rounded-lg bg-background border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background outline-none'
            />
            {errors.port && (
              <p className='text-sm text-destructive'>{errors.port.message}</p>
            )}
          </div>

          <div>
            <h3 className='text-lg font-medium'>Appearance</h3>
            <RadioGroup
              value={settings?.theme || 'system'}
              onChange={async (theme) => {
                await updateSettings({
                  ...settings!,
                  theme: theme as 'light' | 'dark' | 'system',
                })
              }}
              className='mt-4'
            >
              <RadioGroup.Label className='sr-only'>Theme</RadioGroup.Label>
              <div className='grid grid-cols-3 gap-3'>
                {['light', 'dark', 'system'].map((mode) => (
                  <RadioGroup.Option
                    key={mode}
                    value={mode}
                    className={({ active, checked }) =>
                      cn(
                        'cursor-pointer focus:outline-none transition-colors',
                        active &&
                          'ring-2 ring-offset-2 ring-ring ring-offset-background',
                        checked
                          ? 'bg-primary border-transparent text-primary-foreground hover:bg-primary/90'
                          : 'bg-background border-border hover:bg-accent hover:text-accent-foreground',
                        'border rounded-lg py-3 px-3 flex items-center justify-center text-sm font-medium uppercase'
                      )
                    }
                  >
                    <RadioGroup.Label as='span'>{mode}</RadioGroup.Label>
                  </RadioGroup.Option>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>
        <div className='mt-6 flex justify-start gap-2'>
          <Button
            variant='primary'
            type='submit'
            className='mb-6'
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
            }}
          >
            Save
          </Button>
          <Button
            variant='secondary'
            onClick={closeSettingsDialog}
            className='mb-6'
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              border: 'none',
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
