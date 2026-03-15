import type { UserSettings } from '@/domain/repositories/userSettings'
import type { UserSettingsDto } from '../dto/userSettingsDto'

export const userSettingsToUserSettingsDto = (settings: UserSettings): UserSettingsDto => {
  return {
    isOfflineMode: settings.isOfflineMode,
  }
}

export const userSettingsDtoToUserSettings = (dto: UserSettingsDto): UserSettings => {
  return {
    isOfflineMode: dto.isOfflineMode,
  }
}
