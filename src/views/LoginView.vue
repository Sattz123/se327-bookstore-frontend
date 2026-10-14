<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleSubmit() {
  errorMessage.value = ''

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Please provide both email and password.'
    return
  }

  isLoading.value = true
  try {
    await authStore.login({
      email: email.value.trim(),
      password: password.value,
    })
    const target = (route.query.redirect as string) || '/'
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
  <main class="mx-auto max-w-md px-5 py-12">
    <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Sign in to your account</h1>
        <p class="mt-2 text-sm text-slate-600">Welcome back! Please enter your details below.</p>
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

      <div class="mt-6 text-center text-sm text-slate-600">
        Don't have an account?
        <RouterLink
          :to="{ name: 'register' }"
          class="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Create one now
        </RouterLink>
      </div>
    </div>
  </main>
</template>
