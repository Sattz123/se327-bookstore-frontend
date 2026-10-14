<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/AuthService'

const props = withDefaults(defineProps<{ administrator?: boolean }>(), { administrator: false })

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleSubmit() {
  if (isLoading.value) return
  errorMessage.value = ''

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Please provide both email and password.'
    return
  }

  isLoading.value = true
  try {
    const credentials = {
      email: email.value.trim(),
      password: password.value,
    }
    if (props.administrator) {
      const data = await AuthService.login(credentials)
      if (data.user.role !== 'ADMIN') {
        errorMessage.value = 'This account does not have administrator access.'
        return
      }
      authStore.setAuth(data)
    } else await authStore.login(credentials)
    const redirect = route.query.redirect
    const safeRedirect =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    const target = props.administrator
      ? safeRedirect &&
        (redirect === '/admin' || redirect.startsWith('/admin/')) &&
        !redirect.startsWith('/admin/login')
        ? redirect
        : '/admin'
      : safeRedirect
        ? redirect
        : authStore.isAdmin
          ? '/admin'
          : '/'
    await router.push(target)
  } catch (err: unknown) {
    const errorResponse = (err as { response?: { data?: { detail?: string; message?: string } } })
      ?.response?.data
    errorMessage.value =
      errorResponse?.detail ||
      errorResponse?.message ||
      'Invalid email or password. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <component
    :is="administrator ? 'main' : 'section'"
    :id="administrator ? 'main-content' : undefined"
    tabindex="-1"
    class="mx-auto w-full max-w-md"
    :class="{ 'px-5 py-12': administrator }"
  >
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          {{ administrator ? 'Administrator sign in' : 'Sign in to your account' }}
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          {{
            administrator
              ? 'Sign in with an administrator account to open the back office.'
              : 'Welcome back! Please enter your details below.'
          }}
        </p>
        <p
          v-if="administrator && route.query.reason === 'unavailable'"
          role="alert"
          class="mt-3 text-sm text-rose-700"
        >
          Unable to verify administrator access. Please try again.
        </p>
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
      >
        {{ errorMessage }}
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700">Email address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
            <RouterLink
              :to="{ name: 'forgot-password' }"
              class="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </RouterLink>
          </div>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60"
        >
          <span v-if="isLoading">Signing in...</span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <div v-if="!administrator" class="mt-6 text-center text-sm text-slate-600">
        Don't have an account?
        <RouterLink
          :to="{ name: 'register' }"
          class="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Create one now
        </RouterLink>
      </div>
      <div class="mt-5 text-center text-sm">
        <RouterLink
          :to="administrator ? { name: 'home' } : { name: 'admin-login' }"
          class="font-medium text-indigo-600 hover:underline"
          >{{ administrator ? 'Return to storefront' : 'Administrator sign in' }}</RouterLink
        >
      </div>
    </div>
  </component>
</template>
