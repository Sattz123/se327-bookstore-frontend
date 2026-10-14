<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AuthService } from '@/services/AuthService'

const email = ref('')
const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    errorMessage.value = 'Please enter your email address.'
    return
  }

  isSubmitting.value = true
  try {
    const response = await AuthService.forgotPassword({ email: trimmedEmail })
    successMessage.value =
      response.message ||
      'If an account with that email exists, password reset instructions have been sent.'
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
        'Unable to process password reset request. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-5 py-12">
    <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Forgot your password?</h1>
        <p class="mt-2 text-sm text-slate-600">
          Enter your registered email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div
        v-if="successMessage"
        role="status"
        class="mb-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        <p class="font-medium">{{ successMessage }}</p>
        <p class="mt-2 text-xs text-emerald-700">
          In development mode, check the backend terminal for the generated recovery link.
        </p>
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
      >
        {{ errorMessage }}
      </div>

      <form id="forgot-password-form" class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label for="forgot-email" class="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60"
        >
          <span v-if="isSubmitting">Sending reset instructions...</span>
          <span v-else>Send reset link</span>
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-slate-600">
        Remember your password?
        <RouterLink
          :to="{ name: 'login' }"
          class="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to sign in
        </RouterLink>
      </div>
    </div>
  </main>
</template>
