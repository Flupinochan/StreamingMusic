import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UserSettingsRepository,
} from '@/domain/repositories/userSettings'
import {
  userSettingsDtoToUserSettings,
  userSettingsToUserSettingsDto,
} from './mapper/userSettingsMapper'
import { UserSettingsRepositoryIndexedDB } from './userSettingsRepositoryIndexedDB'

export class UserSettingsRepositoryImpl implements UserSettingsRepository {
  private readonly repo: UserSettingsRepositoryIndexedDB

  constructor(repo: UserSettingsRepositoryIndexedDB) {
    this.repo = repo
  }

  async get(): Promise<UserSettings> {
    const dto = await this.repo.get()

    // 設定がない場合はIndexedDBからundefinedが返却される
    // その場合はデフォルトの設定を返却
    if (!dto) {
      return DEFAULT_USER_SETTINGS
    }

    return userSettingsDtoToUserSettings(dto)
  }

  async save(settings: UserSettings): Promise<void> {
    await this.repo.save(userSettingsToUserSettingsDto(settings))
  }
}
