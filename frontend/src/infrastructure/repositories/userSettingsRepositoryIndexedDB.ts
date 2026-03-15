import type { UserSettingsDto } from './dto/userSettingsDto'

// schema変更時にバージョンを上げる必要がある
const DATABASE_VERSION = 1
const DATABASE_NAME = 'streaming-music'
const STORE_NAME = 'userSettings'
const SETTINGS_KEY = 'user-settings'

export class UserSettingsRepositoryIndexedDB {
  private dbPromise: Promise<IDBDatabase> | undefined

  async get(): Promise<UserSettingsDto | undefined> {
    const store = await this.openStore('readonly')
    return new Promise((resolve, reject) => {
      const request = store.get(SETTINGS_KEY)

      request.onsuccess = () => {
        resolve(request.result as UserSettingsDto | undefined)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('Failed to load user settings from IndexedDB.'))
      }
    })
  }

  async save(settings: UserSettingsDto): Promise<void> {
    const store = await this.openStore('readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(settings, SETTINGS_KEY)

      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('Failed to save user settings to IndexedDB.'))
      }
    })
  }

  private async openStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.openDatabase()
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

        // 初回アクセス時、バージョンアップ時にストアを作成
        request.onupgradeneeded = () => {
          const database = request.result

          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME)
          }
        }

        request.onsuccess = () => {
          resolve(request.result)
        }
        request.onerror = () => {
          reject(request.error ?? new Error('Failed to open IndexedDB.'))
        }
      })
    }

    return this.dbPromise
  }
}
