<template>
  <div class="container-fluid">
    <v-card-title>Sign in</v-card-title>
    <v-card-text>
      <!-- 認証エラー時のメッセージ表示 -->
      <v-alert v-if="errorMessage" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>

      <!-- Email -->
      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        autocomplete="email"
        :disabled="isLoading"
      />

      <!-- Password -->
      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        autocomplete="current-password"
        :disabled="isLoading"
      />

      <v-btn
        class="mb-4"
        aria-label="サインイン"
        block
        :loading="isLoading"
        :disabled="isLoading || !email || !password"
        @click="handleSignIn"
      >
        Sign in
      </v-btn>

      <!-- パスワード再設定が必要な場合 -->
      <div v-if="requiresNewPassword">
        <v-alert type="info" variant="tonal" class="mb-4"> New password is required. </v-alert>

        <v-text-field
          v-model="newPassword"
          label="New password"
          type="password"
          autocomplete="new-password"
          :disabled="isLoading"
        />

        <v-btn
          class="mb-4"
          block
          aria-label="新しいパスワードを設定"
          :loading="isLoading"
          :disabled="isLoading || !newPassword"
          @click="handleConfirmNewPassword"
        >
          Set new password
        </v-btn>
      </div>
    </v-card-text>
  </div>
</template>

<script setup lang="ts">
import { initAmplify } from '@/infrastructure/amplify'
import { confirmSignIn, getCurrentUser, signIn } from 'aws-amplify/auth'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const newPassword = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const requiresNewPassword = ref(false)

const redirectPath = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q.length > 0 ? q : '/admin'
})

const handleSignIn = async (): Promise<void> => {
  errorMessage.value = ''
  requiresNewPassword.value = false
  newPassword.value = ''
  isLoading.value = true

  try {
    const result = await signIn({
      username: email.value.trim(),
      password: password.value,
    })

    // サインイン成功時
    if (result.isSignedIn) {
      await router.replace(redirectPath.value)
      return
    }

    // パスワード再設定が必要な場合
    const step = result.nextStep?.signInStep
    if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      requiresNewPassword.value = true
      return
    }

    // それ以外の追加ステップが必要な場合
    errorMessage.value = `サインインが完了しませんでした。追加ステップが必要な可能性があります: ${step}`
  } catch (error) {
    errorMessage.value = `エラーが発生しました: ${error}`
  } finally {
    isLoading.value = false
  }
}

const handleConfirmNewPassword = async (): Promise<void> => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const result = await confirmSignIn({
      challengeResponse: newPassword.value,
    })

    if (result.isSignedIn) {
      requiresNewPassword.value = false
      await router.replace(redirectPath.value)
      return
    }

    const step = result.nextStep?.signInStep
    errorMessage.value = `サインインが完了しませんでした。追加ステップが必要な可能性があります: ${step}`
  } catch (error) {
    errorMessage.value = `エラーが発生しました: ${error}`
  } finally {
    isLoading.value = false
  }
}

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    router.push({ path: 'home' })
  }
}

onMounted(async () => {
  initAmplify()

  window.addEventListener('keydown', handleKeydown)
  try {
    // getCurrentUserはサインイン済みの場合に成功し、失敗するとエラーがスローされる
    await getCurrentUser()
    // サインイン済みの場合はリダイレクト
    await router.replace(redirectPath.value)
  } catch {}
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped></style>
