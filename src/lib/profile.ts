import { AppProfile } from '@/app/interfaces/settings'

const PROFILES_STORAGE_KEY = 'agc:profiles'
const ACTIVE_PROFILE_STORAGE_KEY = 'agc:active-profile'

export const DEFAULT_PROFILE_ID = 'default'
export const DEFAULT_PROFILE_NAME = 'Default'

export const getDefaultProfile = (): AppProfile => ({
  id: DEFAULT_PROFILE_ID,
  name: DEFAULT_PROFILE_NAME,
  created_at: 0,
})

const normalizeProfiles = (profiles?: AppProfile[]): AppProfile[] => {
  const fallback = [getDefaultProfile()]
  if (!profiles?.length) return fallback

  const sanitized = profiles
    .filter((profile) => profile?.id && profile?.name)
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      created_at: Number(profile.created_at) || Date.now(),
    }))

  if (!sanitized.length) return fallback

  const hasDefault = sanitized.some((profile) => profile.id === DEFAULT_PROFILE_ID)
  return hasDefault ? sanitized : [getDefaultProfile(), ...sanitized]
}

export const readProfilesState = (): {
  profiles: AppProfile[]
  activeProfileId: string
} => {
  if (typeof window === 'undefined') {
    return { profiles: [getDefaultProfile()], activeProfileId: DEFAULT_PROFILE_ID }
  }

  const rawProfiles = window.localStorage.getItem(PROFILES_STORAGE_KEY)
  const rawActiveProfileId = window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)

  let parsedProfiles: AppProfile[] = [getDefaultProfile()]

  try {
    parsedProfiles = normalizeProfiles(
      rawProfiles ? (JSON.parse(rawProfiles) as AppProfile[]) : [getDefaultProfile()]
    )
  } catch {
    parsedProfiles = [getDefaultProfile()]
  }

  const activeProfileId = parsedProfiles.some(
    (profile) => profile.id === rawActiveProfileId
  )
    ? (rawActiveProfileId as string)
    : DEFAULT_PROFILE_ID

  return {
    profiles: parsedProfiles,
    activeProfileId,
  }
}

export const persistProfilesState = (
  profiles: AppProfile[],
  activeProfileId: string
) => {
  if (typeof window === 'undefined') return

  const normalizedProfiles = normalizeProfiles(profiles)
  const normalizedActiveProfileId = normalizedProfiles.some(
    (profile) => profile.id === activeProfileId
  )
    ? activeProfileId
    : DEFAULT_PROFILE_ID

  window.localStorage.setItem(
    PROFILES_STORAGE_KEY,
    JSON.stringify(normalizedProfiles)
  )
  window.localStorage.setItem(
    ACTIVE_PROFILE_STORAGE_KEY,
    normalizedActiveProfileId
  )
}

export const buildProfileDbUrl = (profileId: string): string => {
  if (profileId === DEFAULT_PROFILE_ID) {
    return 'sqlite:timersv2.db'
  }

  return `sqlite:timersv2.profile-${profileId}.db`
}

const randomSuffix = () => Math.random().toString(36).slice(2, 9)

export const createProfile = (name: string): AppProfile => {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Profile name is required')
  }

  const slugBase = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)

  const slug = slugBase.length ? slugBase : 'profile'

  return {
    id: `${slug}-${randomSuffix()}`,
    name: trimmed,
    created_at: Date.now(),
  }
}

export const getBrowserSettingsStorageKey = (profileId: string): string =>
  `app-settings:${profileId}`
