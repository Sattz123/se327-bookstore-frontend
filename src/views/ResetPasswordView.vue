<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { AuthService } from '@/services/AuthService'

const route = useRoute()

const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const isVerifying = ref(true)
const isTokenValid = ref(false)
const tokenErrorMessage = ref('')

const isSubmitting = ref(false)
const isResetComplete = ref(false)
const formErrorMessage = ref('')
const successMessage = ref('')

onMounted(async () => {
  const queryToken = route.query.token
  if (typeof queryToken === 'string' && queryToken.trim()) {
    token.value = queryToken.trim()
    await verifyToken(token.value)
  } else {
    isVerifying.value = false
    isTokenValid.value = false
    tokenErrorMessage.value =
      'No password reset token was provided. Please request a new recovery link.'
  }
})

async function verifyToken(tokenStr: string) {
  isVerifying.value = true
  tokenErrorMessage.value = ''

  try {
    const response = await AuthService.verifyResetToken(tokenStr)
    if (response.valid) {
      isTokenValid.value = true
    } else {
      isTokenValid.value = false
      tokenErrorMessage.value = response.message || 'Invalid or expired password reset link.'
    }
  } catch {
    isTokenValid.value = false
    tokenErrorMessage.value =
      'Unable to verify your password reset link. It may be expired or already used.'
  } finally {
    isVerifying.value = false
  }
}

async function handleResetPassword() {
  formErrorMessage.value = ''

  if (!newPassword.value || !confirmPassword.value) {
    formErrorMessage.value = 'Please provide and confirm your new password.'
    return
  }

  if (newPassword.value.length < 6) {
    formErrorMessage.value = 'Password must be at least 6 characters long.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    formErrorMessage.value = 'Passwords do not match.'
    return
  }

  isSubmitting.value = true
  try {
    const response = await AuthService.resetPassword({
      token: token.value,
      newPassword: newPassword.value,
    })

    isResetComplete.value = true
    successMessage.value =
      response.message || 'Your password has been reset successfully. You can now log in.'
  } catch (err: unknown) {
    const errorResponse = (
      err as {
        response?: {
          data?: {
            detail?: string
            message?: string
            status?: number
          }
        }
      }
    )?.response?.data

    formErrorMessage.value =
      errorResponse?.detail ||
      errorResponse?.message ||
      'Failed to reset password. The link may have expired or already been used.'

    if (
      errorResponse?.detail?.toLowerCase().includes('expired') ||
      errorResponse?.detail?.toLowerCase().includes('already been used') ||
      errorResponse?.detail?.toLowerCase().includes('invalid')
    ) {
      isTokenValid.value = false
      tokenErrorMessage.value = formErrorMessage.value
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
        <p class="mt-2 text-sm text-slate-600">Enter a secure new password for your account.</p>
      </div>

      <!-- Verifying Token State -->
      <div v-if="isVerifying" class="py-8 text-center text-sm text-slate-500">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
        ></div>
        <p class="mt-4">Verifying your recovery link...</p>
      </div>

      <!-- Invalid or Expired Token State -->
      <div v-else-if="!isTokenValid && !isResetComplete" class="space-y-6">
        <div role="alert" class="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
          <p class="font-semibold">Invalid or Expired Link</p>
          <p class="mt-1">{{ tokenErrorMessage }}</p>
        </div>

        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'forgot-password' }"
            class="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            Request a new reset link
          </RouterLink>

          <RouterLink
            :to="{ name: 'login' }"
            class="flex w-full justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Return to sign in
          </RouterLink>
        </div>
      </div>

      <!-- Reset Complete State -->
      <div v-else-if="isResetComplete" class="space-y-6">
        <div role="status" class="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          <p class="font-semibold">Password Reset Complete</p>
          <p class="mt-1">{{ successMessage }}</p>
        </div>

        <RouterLink
          :to="{ name: 'login' }"
          class="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        >
          Sign in with new password
        </RouterLink>
      </div>

      <!-- Password Reset Form -->
      <div v-else>
        <div
          v-if="formErrorMessage"
          role="alert"
          class="mb-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
        >
          {{ formErrorMessage }}
        </div>

        <form id="reset-password-form" class="space-y-5" @submit.prevent="handleResetPassword">
          <div>
            <label for="new-password" class="block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
              class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label for="confirm-password" class="block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
              class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              placeholder="Re-enter your new password"
            />
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60"
          >
            <span v-if="isSubmitting">Resetting password...</span>
            <span v-else>Set new password</span>
          </button>
        </form>
      </div>
    </div>
  </main>
</template>
