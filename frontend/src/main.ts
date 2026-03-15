import '@/assets/styles/utilities.scss'
import {
  mdiPause,
  mdiPlay,
  mdiRepeat,
  mdiRepeatOnce,
  mdiShuffleVariant,
  mdiSkipNext,
  mdiSkipPrevious,
} from '@mdi/js'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { ja } from 'vuetify/locale'
import 'vuetify/styles/core'
import colors from 'vuetify/util/colors'
import App from './App.vue'
import { makeApiClient } from './infrastructure/apiClient'
import { MusicDataRepositoryImpl } from './infrastructure/repositories/musicDataRepositoryImpl'
import { MusicDataRepositoryRest } from './infrastructure/repositories/musicDataRepositoryRest'
import { MusicMetadataRepositoryImpl } from './infrastructure/repositories/musicMetadataRepositoryImpl'
import { MusicMetadataRepositoryRest } from './infrastructure/repositories/musicMetadataRepositoryRest'
import { UserSettingsRepositoryImpl } from './infrastructure/repositories/userSettingsRepositoryImpl'
import { UserSettingsRepositoryIndexedDB } from './infrastructure/repositories/userSettingsRepositoryIndexedDB'
import { useMusicStore } from './presentation/stores/useMusicStore'
import { router } from './router'
import { CreateMusicUsecase } from './use_cases/createMusicUsecase'
import { ListMusicMetadataUsecase } from './use_cases/listMusicMetadataUsecase'
import { RemoveMusicUsecase } from './use_cases/removeMusicUsecase'
const apiClient = makeApiClient()

const pinia = createPinia()

const vuetify = createVuetify({
  locale: {
    locale: 'ja',
    messages: {
      ja: {
        ...ja,
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases: {
      ...aliases,
      mdiPlay,
      mdiSkipNext,
      mdiSkipPrevious,
      mdiPause,
      mdiRepeat,
      mdiRepeatOnce,
      mdiShuffleVariant,
    },
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'system',
    themes: {
      light: { colors: { primary: colors.blue.base } },
      dark: { colors: { primary: colors.blue.base } },
    },
  },
  defaults: {
    // globalは使用しない
    // global: {},
    VBtn: {
      color: 'primary',
    },
    VSlider: {
      color: 'primary',
    },
    VListItemTitle: {
      class: 'primary',
    },
    VSnackbar: {
      color: 'primary',
    },
  },
})

const app = createApp(App).use(pinia).use(vuetify).use(router)

// DI
const musicRepository = new MusicDataRepositoryImpl(new MusicDataRepositoryRest(apiClient))
const musicMetadataRepository = new MusicMetadataRepositoryImpl(
  new MusicMetadataRepositoryRest(apiClient),
)
const createMusicUsecase = new CreateMusicUsecase(musicRepository, musicMetadataRepository)
const removeMusicUsecase = new RemoveMusicUsecase(musicRepository, musicMetadataRepository)
const listMusicMetadataUsecase = new ListMusicMetadataUsecase(musicMetadataRepository)
const userSettingsRepository = new UserSettingsRepositoryImpl(new UserSettingsRepositoryIndexedDB())
useMusicStore(pinia).setCreateMusicUsecase(createMusicUsecase)
useMusicStore(pinia).setRemoveMusicUsecase(removeMusicUsecase)
useMusicStore(pinia).setListMusicMetadataUsecase(listMusicMetadataUsecase)
useMusicStore(pinia).setUserSettingsRepository(userSettingsRepository)

app.mount('#app')
