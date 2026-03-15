export interface UserSettings {
  isOfflineMode: boolean
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  isOfflineMode: false,
}

export interface UserSettingsRepository {
  get(): Promise<UserSettings>
  save(settings: UserSettings): Promise<void>
}
