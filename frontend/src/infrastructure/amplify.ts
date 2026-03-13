import { Amplify } from 'aws-amplify'
import { fetchAuthSession } from 'aws-amplify/auth'
import { setTokenProvider } from './apiClient'

const amplifyConfig = {
  Auth: {
    Cognito: {
      allowGuestAccess: true,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
}

let initialized = false

async function getAuthToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString()
  } catch {
    return undefined
  }
}

export function initAmplify() {
  if (initialized) return
  Amplify.configure(amplifyConfig)
  setTokenProvider(getAuthToken)
  initialized = true
}
