import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginPayload, RegisterPayload } from '@/types/auth'
import { AuthService } from '@/services/AuthService'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

function getInitialUser(): User | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(getInitialUser())
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const currentUser = computed(() => user.value)

  function setAuth(authData: { token: string; user: User }) {
    token.value = authData.token
    user.value = authData.user
    localStorage.setItem(TOKEN_KEY, authData.token)
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user))
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  async function login(credentials: LoginPayload) {
    const data = await AuthService.login(credentials)
    setAuth(data)
    return data
  }

  async function register(payload: RegisterPayload) {
    const data = await AuthService.register(payload)
    setAuth(data)
    return data
  }

  async function logout() {
    try {
      await AuthService.logout()
    } finally {
      clearAuth()
    }
  }

  async function fetchCurrentUser(): Promise<User | null> {
    if (!token.value) {
      clearAuth()
      isInitialized.value = true
      return null
    }
    try {
      const userData = await AuthService.getCurrentUser()
      user.value = userData
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
      return userData
    } catch {
      clearAuth()
      return null
    } finally {
      isInitialized.value = true
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    currentUser,
    isInitialized,
    login,
    register,
    logout,
    fetchCurrentUser,
    setAuth,
    clearAuth,
  }
})
