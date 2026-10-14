<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ProfileService } from '@/services/ProfileService'

const authStore = useAuthStore()

// Profile details
const username = ref('')
const email = ref('')
const phone = ref('')
const avatarUrl = ref('')
const role = ref('CUSTOMER')
const createdAt = ref('')

const isProfileLoading = ref(false)
const profileSuccessMessage = ref('')
const profileErrorMessage = ref('')

// Password details
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const isPasswordLoading = ref(false)
const passwordSuccessMessage = ref('')
const passwordErrorMessage = ref('')

onMounted(async () => {
  await loadProfile()
})

async function loadProfile() {
  try {
    const user = await ProfileService.getProfile()
    username.value = user.username
    email.value = user.email
    phone.value = user.phone ?? ''
    avatarUrl.value = user.avatarUrl ?? ''
    role.value = user.role
    createdAt.value = user.createdAt
  } catch {
    // Fallback to store if available
    if (authStore.currentUser) {
      username.value = authStore.currentUser.username
      email.value = authStore.currentUser.email
      phone.value = authStore.currentUser.phone ?? ''
      avatarUrl.value = authStore.currentUser.avatarUrl ?? ''
      role.value = authStore.currentUser.role
      createdAt.value = authStore.currentUser.createdAt
    }
  }
}

async function handleProfileUpdate() {
  profileSuccessMessage.value = ''
  profileErrorMessage.value = ''

  if (!username.value.trim() || !email.value.trim()) {
    profileErrorMessage.value = 'Name and email are required.'
    return
  }

  isProfileLoading.value = true
  try {
    const updated = await ProfileService.updateProfile({
      username: username.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim() || null,
      avatarUrl: avatarUrl.value.trim() || null,
    })

    authStore.setAuth(updated)
    profileSuccessMessage.value = 'Profile updated successfully!'
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
      profileErrorMessage.value = errorResponse.errors.map((e) => e.message).join(' ')
    } else {
      profileErrorMessage.value =
        errorResponse?.detail ||
        errorResponse?.message ||
        'Failed to update profile. Please try again.'
    }
  } finally {
    isProfileLoading.value = false
  }
}

async function handlePasswordChange() {
  passwordSuccessMessage.value = ''
  passwordErrorMessage.value = ''

  if (!currentPassword.value || !newPassword.value) {
    passwordErrorMessage.value = 'Please provide both current and new password.'
    return
  }

  if (newPassword.value.length < 6) {
    passwordErrorMessage.value = 'New password must be at least 6 characters long.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordErrorMessage.value = 'New passwords do not match.'
    return
  }

  isPasswordLoading.value = true
  try {
    const response = await ProfileService.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })

    passwordSuccessMessage.value = response.message || 'Password changed successfully!'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: unknown) {
    const errorResponse = (
      err as {
        response?: {
          data?: {
            detail?: string
            message?: string
          }
        }
      }
    )?.response?.data

    passwordErrorMessage.value =
      errorResponse?.detail ||
      errorResponse?.message ||
      'Failed to change password. Please check your current password.'
  } finally {
    isPasswordLoading.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-4xl px-5 py-10 sm:px-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">My Account</h1>
      <p class="mt-1 text-sm text-slate-600">
        Manage your profile information, contact details, and security settings.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
      <!-- Account Summary Card -->
      <div class="md:col-span-1">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div class="flex flex-col items-center text-center">
            <div
              v-if="avatarUrl"
              class="h-20 w-20 overflow-hidden rounded-full border border-slate-200"
            >
              <img :src="avatarUrl" :alt="username" class="h-full w-full object-cover" />
            </div>
            <div
              v-else
              class="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700"
            >
              {{ username.charAt(0).toUpperCase() || 'U' }}
            </div>

            <h2 class="mt-4 text-lg font-semibold text-slate-900">{{ username || 'User' }}</h2>
            <p class="text-xs text-slate-500">{{ email }}</p>

            <span
              v-if="role === 'ADMIN'"
              class="mt-3 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
            >
              Administrator
            </span>
            <span
              v-else
              class="mt-3 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800"
            >
              Customer
            </span>

            <div
              v-if="createdAt"
              class="mt-6 w-full border-t border-slate-100 pt-4 text-left text-xs text-slate-500"
            >
              Member since: {{ new Date(createdAt).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Forms Container -->
      <div class="space-y-8 md:col-span-2">
        <!-- Edit Profile Form -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <h2 class="text-xl font-bold text-slate-900">Profile Information</h2>
          <p class="mt-1 text-sm text-slate-600">Update your account name, email, and phone.</p>

          <div
            v-if="profileSuccessMessage"
            role="status"
            class="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {{ profileSuccessMessage }}
          </div>

          <div
            v-if="profileErrorMessage"
            role="alert"
            class="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
          >
            {{ profileErrorMessage }}
          </div>

          <form id="profile-form" class="mt-6 space-y-4" @submit.prevent="handleProfileUpdate">
            <div>
              <label for="profile-name" class="block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                id="profile-name"
                v-model="username"
                type="text"
                required
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label for="profile-email" class="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="profile-email"
                v-model="email"
                type="email"
                required
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label for="profile-phone" class="block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <input
                id="profile-phone"
                v-model="phone"
                type="tel"
                placeholder="0812345678"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label for="profile-avatar" class="block text-sm font-medium text-slate-700">
                Avatar image URL <span class="text-xs text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="profile-avatar"
                v-model="avatarUrl"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="isProfileLoading"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60"
              >
                <span v-if="isProfileLoading">Saving changes...</span>
                <span v-else>Save Profile</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Change Password Form -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <h2 class="text-xl font-bold text-slate-900">Change Password</h2>
          <p class="mt-1 text-sm text-slate-600">Ensure your account uses a secure password.</p>

          <div
            v-if="passwordSuccessMessage"
            role="status"
            class="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {{ passwordSuccessMessage }}
          </div>

          <div
            v-if="passwordErrorMessage"
            role="alert"
            class="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
          >
            {{ passwordErrorMessage }}
          </div>

          <form id="password-form" class="mt-6 space-y-4" @submit.prevent="handlePasswordChange">
            <div>
              <label for="current-password" class="block text-sm font-medium text-slate-700">
                Current password
              </label>
              <input
                id="current-password"
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                required
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                placeholder="••••••••"
              />
            </div>

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
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label for="confirm-new-password" class="block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="confirm-new-password"
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                placeholder="Re-enter new password"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="isPasswordLoading"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60"
              >
                <span v-if="isPasswordLoading">Updating password...</span>
                <span v-else>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>
