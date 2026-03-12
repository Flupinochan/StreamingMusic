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
import { Amplify } from 'aws-amplify'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { ja } from 'vuetify/locale'
import 'vuetify/styles/core'
import colors from 'vuetify/util/colors'
import App from './App.vue'
import { makeApiClient } from './infrastructure/apiClient'
import { MusicDataRepositoryAmplify } from './infrastructure/repositories/musicDataRepositoryAmplify'
import { MusicDataRepositoryImpl } from './infrastructure/repositories/musicDataRepositoryImpl'
import { MusicMetadataRepositoryAmplify } from './infrastructure/repositories/musicMetadataRepositoryAppSync'
import { MusicMetadataRepositoryImpl } from './infrastructure/repositories/musicMetadataRepositoryImpl'
import { useMusicStore } from './presentation/stores/useMusicStore'
import { router } from './router'
import { CreateMusicUsecase } from './use_cases/createMusicUsecase'
import { ListMusicMetadataUsecase } from './use_cases/listMusicMetadataUsecase'
import { RemoveMusicUsecase } from './use_cases/removeMusicUsecase'

const amplifyConfig = {
  Auth: {
    Cognito: {
      allowGuestAccess: true,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_APPSYNC_ENDPOINT,
      region: 'ap-northeast-1',
      defaultAuthMode: 'iam' as const,
    },
  },
}

Amplify.configure(amplifyConfig)
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
const musicRepository = new MusicDataRepositoryImpl(new MusicDataRepositoryAmplify(apiClient))
const musicMetadataRepository = new MusicMetadataRepositoryImpl(
  new MusicMetadataRepositoryAmplify(apiClient),
)
const createMusicUsecase = new CreateMusicUsecase(musicRepository, musicMetadataRepository)
const removeMusicUsecase = new RemoveMusicUsecase(musicRepository, musicMetadataRepository)
const listMusicMetadataUsecase = new ListMusicMetadataUsecase(musicMetadataRepository)
useMusicStore(pinia).setCreateMusicUsecase(createMusicUsecase)
useMusicStore(pinia).setRemoveMusicUsecase(removeMusicUsecase)
useMusicStore(pinia).setListMusicMetadataUsecase(listMusicMetadataUsecase)

app.mount('#app')
