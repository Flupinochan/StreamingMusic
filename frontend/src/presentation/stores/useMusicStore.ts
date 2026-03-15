import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMusicPlayerStore } from './useMusicPlayerStore'

import type { ListMusicMetadataUsecase } from '@/use_cases/listMusicMetadataUsecase'
import type { CreateMusicDto } from '../../use_cases/createMusicDto'
import type { CreateMusicUsecase } from '../../use_cases/createMusicUsecase'
import type { RemoveMusicDto } from '../../use_cases/removeMusicDto'
import type { RemoveMusicUsecase } from '../../use_cases/removeMusicUsecase'

// CRUD操作用
export const useMusicStore = defineStore('music', () => {
  let createMusicUsecase: CreateMusicUsecase | undefined = undefined
  let removeMusicUsecase: RemoveMusicUsecase | undefined = undefined
  let listMusicMetadataUsecase: ListMusicMetadataUsecase | undefined = undefined
  let listMusicPromise: Promise<void> | undefined = undefined
  const musicPlayerStore = useMusicPlayerStore()

  // UI State
  const isOfflineMode = ref(false)
  const loading = ref(false)
  const error = ref<string | undefined>(undefined)

  const getCreateMusicUsecase = (): CreateMusicUsecase => {
    if (!createMusicUsecase) {
      throw new Error(
        'CreateMusicUsecase is not set. Call useMusicStore(pinia).setCreateMusicUsecase() in main.ts.',
      )
    }
    return createMusicUsecase
  }

  const getRemoveMusicUsecase = (): RemoveMusicUsecase => {
    if (!removeMusicUsecase) {
      throw new Error(
        'RemoveMusicUsecase is not set. Call useMusicStore(pinia).setRemoveMusicUsecase() in main.ts.',
      )
    }
    return removeMusicUsecase
  }

  const getListMusicMetadataUsecase = (): ListMusicMetadataUsecase => {
    if (!listMusicMetadataUsecase) {
      throw new Error(
        'ListMusicMetadataUsecase is not set. Call useMusicStore(pinia).setListMusicMetadataUsecase() in main.ts.',
      )
    }
    return listMusicMetadataUsecase
  }

  // DI用Setter
  const setCreateMusicUsecase = (value: CreateMusicUsecase): void => {
    createMusicUsecase = value
  }

  const setRemoveMusicUsecase = (value: RemoveMusicUsecase): void => {
    removeMusicUsecase = value
  }

  const setListMusicMetadataUsecase = (value: ListMusicMetadataUsecase): void => {
    listMusicMetadataUsecase = value
  }

  const listMusic = async (): Promise<void> => {
    // 複数個所でlistしているため、重複リクエストを排除
    if (listMusicPromise) {
      return listMusicPromise
    }

    loading.value = true
    error.value = undefined
    const usecase = getListMusicMetadataUsecase()

    listMusicPromise = (async () => {
      try {
        const dtos = await usecase.listMusicMetadata()

        musicPlayerStore.setTracks(dtos)
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : ''
        error.value = `音楽リストの取得に失敗しました: ${errorMessage}`
      } finally {
        loading.value = false
        listMusicPromise = undefined
      }
    })()

    return listMusicPromise
  }

  async function uploadMusic(dto: CreateMusicDto): Promise<void> {
    loading.value = true
    error.value = undefined
    const usecase = getCreateMusicUsecase()

    try {
      await usecase.uploadMusic(dto)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : ''
      error.value = `"音楽のアップロードに失敗しました": ${errorMessage}`
      throw e
    } finally {
      loading.value = false
    }
  }

  async function removeMusic(dto: RemoveMusicDto): Promise<void> {
    loading.value = true
    error.value = undefined
    const usecase = getRemoveMusicUsecase()

    try {
      await usecase.removeMusic(dto)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : ''
      error.value = `音楽の削除に失敗しました: ${errorMessage}`
      throw e
    } finally {
      loading.value = false
    }
  }

  const setOfflineMode = (value: boolean): void => {
    isOfflineMode.value = value
  }

  const toggleOfflineMode = (): boolean => {
    const nextIsOfflineMode = !isOfflineMode.value
    isOfflineMode.value = nextIsOfflineMode
    return nextIsOfflineMode
  }

  return {
    setCreateMusicUsecase,
    setRemoveMusicUsecase,
    setListMusicMetadataUsecase,
    setOfflineMode,
    isOfflineMode,
    loading,
    error,
    uploadMusic,
    removeMusic,
    listMusic,
    toggleOfflineMode,
  }
})
