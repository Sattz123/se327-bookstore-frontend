<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleSubmit() {
  errorMessage.value = ''

  if (!username.value.trim() || !email.value.trim() || !password.value) {
    errorMessage.value = 'Please fill in all required fields.'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters long.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  isLoading.value = true
  try {
    await authStore.register({
      username: username.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim() || null,
      password: password.value,
    })
    await router.push({ name: 'home' })
  } catch (err: unknown) {
    const errorResponse = (
      err as {
        response?: {
          data?: {
            detail?: string
            message?: string
            errors?: Array<{ field: string; message: string }>
          }
        }
      }
    )?.response?.data

    if (errorResponse?.errors && errorResponse.errors.length > 0) {
      errorMessage.value = errorResponse.errors.map((e) => e.message).join(' ')
    } else {
      errorMessage.value =
        errorResponse?.detail ||
        errorResponse?.message ||
        'Registration failed. Please check your inputs and try again.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-5 py-12">
    <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p class="mt-2 text-sm text-slate-600">
          Join InwZa Bookstore to start building your library.
        </p>
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
      >
        {{ errorMessage }}
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label for="username" class="block text-sm font-medium text-slate-700">Full name</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="name"
            required
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-slate-700">Email address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="jane@example.com"
          />
        </div>

        <div>
          <label for="phone" class="block text-sm font-medium text-slate-700">
            Phone number <span class="text-xs text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            autocomplete="tel"
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="0812345678"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            required
            minlength="6"
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength="6"
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="Re-enter password"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-2 flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60"
        >
          <span v-if="isLoading">Creating account...</span>
          <span v-else>Register</span>
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-slate-600">
        Already have an account?
        <RouterLink
          :to="{ name: 'login' }"
          class="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Sign in instead
        </RouterLink>
      </div>
    </div>
  </main>
</template>
