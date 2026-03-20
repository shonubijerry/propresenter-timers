import { useEffect, useState } from 'react'
import { useSettings } from '../../providers/settings'
import { useForm } from 'react-hook-form'
import Button from '../ui/Button'
import Modal from './Modal'
import { cn } from '@/lib/cn'
import { fetchJson } from '@/app/hooks/client'
import { AppSettings } from '@/app/interfaces/settings'
import { toastError, toastInfo, toastSuccess } from '@/lib/toastUtils'
import {
  TbCheck,
  TbDatabase,
  TbLock,
  TbPalette,
  TbPlugConnected,
  TbPlugConnectedX,
  TbTrash,
  TbUser,
  TbUsers,
} from 'react-icons/tb'
import { MdInfoOutline } from 'react-icons/md'

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className='flex items-start gap-3 mb-4'>
      <div
        className='flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5'
        style={{
          background: 'color-mix(in srgb, var(--primary) 12%, var(--surface-2) 88%)',
          color: 'var(--primary)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className='text-sm font-semibold' style={{ color: 'var(--foreground)' }}>
          {title}
        </p>
        {description && (
          <p className='text-xs mt-0.5' style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function SettingsSection({ children }: { children: React.ReactNode }) {
  return (
    <div
      className='rounded-2xl border p-4 space-y-4'
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className='block text-xs font-semibold uppercase tracking-[0.12em] mb-1.5'
      style={{ color: 'var(--muted-foreground)' }}
    >
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent placeholder:text-[var(--muted-foreground)]'
const inputStyle = {
  background: 'var(--surface-1)',
  borderColor: 'var(--border)',
  color: 'var(--foreground)',
}

type SettingsTab = 'profiles' | 'datasource' | 'appearance' | 'security'

export default function SettingsDialog() {
  const {
    settings,
    updateSettings,
    isDialogOpen,
    closeSettingsDialog,
    profiles,
    activeProfileId,
    activeProfile,
    createNewProfile,
    deleteProfile,
    switchProfile,
  } = useSettings()

  const [connectionOk, setConnectionOk] = useState<boolean>(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [isProcessingProfile, setIsProcessingProfile] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profiles')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: settings,
    mode: 'onChange',
  })

  const datastore = watch('datastore')

  useEffect(() => {
    reset(settings)
  }, [settings, isDialogOpen, reset])

  useEffect(() => {
    if (!isDialogOpen) return
    setActiveTab('profiles')
  }, [isDialogOpen])

  useEffect(() => {
    if (!isDialogOpen) return
    if (datastore !== 'proPresenter') {
      setConnectionOk(true)
      return
    }

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
        console.error(e instanceof Error ? e.message : 'Connection failed')
        setConnectionOk(false)
      })
  }, [settings?.address, settings?.port, isDialogOpen, datastore])

  const onSubmit = async (data: AppSettings) => {
    await updateSettings(data)
    closeSettingsDialog()
  }

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      toastError('Enter a profile name')
      return
    }

    try {
      setIsProcessingProfile(true)
      await createNewProfile(newProfileName)
      setNewProfileName('')
      toastSuccess('Profile created')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setIsProcessingProfile(false)
    }
  }

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!window.confirm(`Delete profile "${profileName}"?`)) return

    try {
      setIsProcessingProfile(true)
      await deleteProfile(profileId)
      toastSuccess('Profile deleted')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete profile')
    } finally {
      setIsProcessingProfile(false)
    }
  }

  const handleSwitchProfile = async (profileId: string, profileName: string) => {
    if (profileId === activeProfileId) return

    try {
      setIsProcessingProfile(true)
      toastInfo(`Switching to ${profileName} profile...`)
      await switchProfile(profileId)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to switch profile')
      setIsProcessingProfile(false)
    }
  }

  if (!isDialogOpen) return null

  const datastoreOptions = [
    { value: 'proPresenter', label: 'ProPresenter', desc: 'Sync via network API' },
    { value: 'localDb', label: 'Local Database', desc: 'Offline storage only' },
  ]

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'profiles', label: 'Profiles' },
    { id: 'datasource', label: 'Data Source' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'security', label: 'Security' },
  ]

  return (
    <Modal open={isDialogOpen} onClose={closeSettingsDialog} title='Settings' size='lg'>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='space-y-4'>
          <div
            className='rounded-2xl border p-1 flex items-center gap-1 overflow-x-auto'
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
                    isActive ? '' : 'hover:bg-accent'
                  )}
                  style={{
                    background: isActive
                      ? 'color-mix(in srgb, var(--ring) 10%, var(--surface-1) 90%)'
                      : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--foreground)',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'profiles' && (
            <SettingsSection>
              <SectionHeader
                icon={<TbUsers size={18} />}
                title='Profiles'
                description='Each profile has separate settings, fluid timers, and timer logs'
              />

              <div
                className='rounded-xl border px-3 py-2.5 text-sm'
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface-1)',
                  color: 'var(--foreground)',
                }}
              >
                Active profile: <span className='font-semibold'>{activeProfile.name}</span>
              </div>

              <div className='flex flex-col sm:flex-row gap-2'>
                <input
                  type='text'
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateProfile()
                    }
                  }}
                  placeholder='New profile name'
                  className={inputClass}
                  style={inputStyle}
                  disabled={isProcessingProfile}
                />
                <Button
                  variant='primary'
                  type='button'
                  onClick={handleCreateProfile}
                  disabled={isProcessingProfile || !newProfileName.trim()}
                  className='whitespace-nowrap'
                >
                  Create Profile
                </Button>
              </div>

              <div className='space-y-2'>
                {profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId
                  return (
                    <div
                      key={profile.id}
                      className='rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3'
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
                    >
                      <div className='min-w-0'>
                        <p
                          className='text-sm font-semibold flex items-center gap-1.5'
                          style={{ color: 'var(--foreground)' }}
                        >
                          <TbUser size={14} /> {profile.name}
                          {isActive ? (
                            <span
                              className='text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full'
                              style={{
                                background:
                                  'color-mix(in srgb, var(--ring) 10%, var(--surface-2) 90%)',
                                color: 'var(--ring)',
                              }}
                            >
                              active
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Button
                          variant='secondary'
                          size='sm'
                          type='button'
                          onClick={() => handleSwitchProfile(profile.id, profile.name)}
                          disabled={isActive || isProcessingProfile}
                        >
                          Switch
                        </Button>
                        <Button
                          variant='error'
                          size='sm'
                          type='button'
                          onClick={() => handleDeleteProfile(profile.id, profile.name)}
                          disabled={isActive || profile.id === 'default' || isProcessingProfile}
                          className='inline-flex items-center gap-1'
                        >
                          <TbTrash size={14} /> Delete
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </SettingsSection>
          )}

          {activeTab === 'datasource' && (
            <SettingsSection>
              <SectionHeader
                icon={<TbDatabase size={18} />}
                title='Data Source'
                description='Where timers are read from and stored'
              />
              <div className='grid grid-cols-2 gap-2'>
                {datastoreOptions.map((opt) => {
                  const checked = (datastore || 'proPresenter') === opt.value
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      onClick={() =>
                        updateSettings({
                          ...settings!,
                          datastore: opt.value as 'proPresenter' | 'localDb',
                        })
                      }
                      className={cn(
                        'relative flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
                        checked ? 'border-[var(--ring)] text-[var(--primary)]' : 'hover:bg-accent'
                      )}
                      style={{
                        borderColor: checked ? 'var(--ring)' : 'var(--border)',
                        background: checked
                          ? 'color-mix(in srgb, var(--ring) 8%, var(--surface-1) 92%)'
                          : 'var(--surface-1)',
                        color: checked ? 'var(--primary)' : 'var(--foreground)',
                      }}
                    >
                      {checked && (
                        <span
                          className='absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center'
                          style={{ background: 'var(--primary)' }}
                        >
                          <TbCheck size={11} color='white' strokeWidth={3} />
                        </span>
                      )}
                      <span className='text-sm font-semibold'>{opt.label}</span>
                      <span className='text-xs' style={{ color: 'var(--muted-foreground)' }}>
                        {opt.desc}
                      </span>
                    </button>
                  )
                })}
              </div>

              {datastore === 'proPresenter' && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    {connectionOk ? (
                      <span
                        className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold'
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
                      >
                        <TbPlugConnected size={13} /> Connected
                      </span>
                    ) : (
                      <span
                        className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold'
                        style={{
                          background:
                            'color-mix(in srgb, var(--destructive) 10%, transparent)',
                          color: 'var(--destructive)',
                        }}
                      >
                        <TbPlugConnectedX size={13} /> Not connected
                      </span>
                    )}
                    {!connectionOk && (
                      <span
                        className='inline-flex items-center gap-1 text-xs'
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        <MdInfoOutline size={13} />
                        ProPresenter → Settings → Network
                      </span>
                    )}
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <div>
                      <FieldLabel>ProPresenter URL</FieldLabel>
                      <input
                        placeholder='http://127.0.0.1'
                        type='url'
                        {...register('address', {
                          required:
                            datastore === 'proPresenter' ? 'URL is required' : false,
                          pattern: {
                            value:
                              /^http:\/\/(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
                            message: 'Must be http:// followed by IP address',
                          },
                        })}
                        className={inputClass}
                        style={inputStyle}
                      />
                      {errors.address && (
                        <p className='mt-1 text-xs' style={{ color: 'var(--destructive)' }}>
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel>Port</FieldLabel>
                      <input
                        type='number'
                        {...register('port', {
                          required:
                            datastore === 'proPresenter' ? 'Port is required' : false,
                          min: { value: 1, message: 'Port must be > 0' },
                          max: { value: 65535, message: 'Port must be ≤ 65535' },
                        })}
                        className={inputClass}
                        style={inputStyle}
                      />
                      {errors.port && (
                        <p className='mt-1 text-xs' style={{ color: 'var(--destructive)' }}>
                          {errors.port.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {datastore === 'localDb' && (
                <p
                  className='text-xs rounded-xl border px-3 py-2.5'
                  style={{
                    color: 'var(--muted-foreground)',
                    borderColor: 'var(--border)',
                    background: 'var(--surface-1)',
                  }}
                >
                  Timers are stored locally on this device, independent from ProPresenter.
                </p>
              )}
            </SettingsSection>
          )}

          {activeTab === 'appearance' && (
            <SettingsSection>
              <SectionHeader
                icon={<TbPalette size={18} />}
                title='Appearance'
                description='Choose a colour theme for the interface'
              />
              <div className='grid grid-cols-3 gap-2'>
                {themeOptions.map((opt) => {
                  const checked = (settings?.theme || 'system') === opt.value
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      onClick={() =>
                        updateSettings({
                          ...settings!,
                          theme: opt.value as 'light' | 'dark' | 'system',
                        })
                      }
                      className={cn(
                        'relative flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-all focus:outline-none focus:ring-2 focus:ring-[var(--ring)]'
                      )}
                      style={{
                        borderColor: checked ? 'var(--ring)' : 'var(--border)',
                        background: checked
                          ? 'color-mix(in srgb, var(--ring) 8%, var(--surface-1) 92%)'
                          : 'var(--surface-1)',
                        color: checked ? 'var(--primary)' : 'var(--foreground)',
                      }}
                    >
                      {checked && (
                        <span
                          className='absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center'
                          style={{ background: 'var(--primary)' }}
                        >
                          <TbCheck size={9} color='white' strokeWidth={3} />
                        </span>
                      )}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
          )}

          {activeTab === 'security' && (
            <SettingsSection>
              <SectionHeader
                icon={<TbLock size={18} />}
                title='Timer Lock Security'
                description='Password required to unlock a locked timer'
              />
              <div>
                <FieldLabel>Unlock Password</FieldLabel>
                <input
                  type='password'
                  placeholder='Set a password to protect timers'
                  {...register('lock_password')}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </SettingsSection>
          )}
        </div>

        <div
          className='flex items-center justify-end gap-2 mt-5 pt-4 border-t'
          style={{ borderColor: 'var(--border)' }}
        >
          <Button variant='secondary' type='button' onClick={closeSettingsDialog}>
            Cancel
          </Button>
          <Button variant='primary' type='submit'>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
