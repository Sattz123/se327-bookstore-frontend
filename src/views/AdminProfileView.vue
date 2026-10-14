<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AdminProfileService } from '@/services/AdminProfileService'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/auth'

const auth = useAuthStore()
const router = useRouter()
const profile = ref<User | null>(null)
const form = reactive({ username: '', email: '', phone: '', avatarUrl: '' })
const passwords = reactive({ current: '', next: '', confirm: '' })
const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)
const busy = computed(() => loading.value || saving.value || changingPassword.value)
const loadError = ref('')
const profileError = ref('')
const profileSuccess = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
let controller: AbortController | undefined
let active = true

function fill(user: User) {
  profile.value = user
  form.username = user.username
  form.email = user.email
  form.phone = user.phone ?? ''
  form.avatarUrl = user.avatarUrl ?? ''
}
function clearPasswords() {
  passwords.current = ''
  passwords.next = ''
  passwords.confirm = ''
}
function sessionMatches(token: string | null) {
  return active && auth.isAdmin && !!token && auth.token === token
}
function message(cause: unknown, fallback: string) {
  if (!isAxiosError(cause)) return fallback
  if (cause.response?.status === 401) auth.clearAuth()
  if (cause.response?.status === 403) void router.replace({ name: 'forbidden' })
  const problem = cause.response?.data as
    { detail?: string; errors?: { field: string; message: string }[] } | undefined
  return problem?.errors?.map((item) => item.message).join(' ') || problem?.detail || fallback
}
async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  const token = auth.token
  loading.value = true
  loadError.value = ''
  try {
    const user = await AdminProfileService.get(request.signal)
    if (!request.signal.aborted && sessionMatches(token)) fill(user)
  } catch (cause) {
    if (!request.signal.aborted && sessionMatches(token))
      loadError.value = message(cause, 'Unable to load your profile. Please try again.')
  } finally {
    if (!request.signal.aborted && active) loading.value = false
  }
}
async function save() {
  if (busy.value || !profile.value) return
  profileSuccess.value = ''
  profileError.value = ''
  if (form.username.trim().length < 2 || !form.email.trim()) {
    profileError.value = 'Enter a name of at least two characters and an email address.'
    return
  }
  const token = auth.token
  saving.value = true
  try {
    const result = await AdminProfileService.update({
      username: form.username.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
    })
    if (sessionMatches(token)) {
      auth.setAuth(result)
      fill(result.user)
      profileSuccess.value = 'Profile updated successfully.'
    }
  } catch (cause) {
    if (sessionMatches(token))
      profileError.value = message(cause, 'Unable to save your profile. Please try again.')
  } finally {
    if (active) saving.value = false
  }
}
async function changePassword() {
  if (busy.value || !profile.value) return
  passwordSuccess.value = ''
  passwordError.value = ''
  if (passwords.next !== passwords.confirm) {
    passwordError.value = 'New passwords do not match.'
    return
  }
  if (!passwords.current || passwords.next.length < 6 || passwords.next.length > 100) {
    passwordError.value = 'Enter your current password and a new password of 6–100 characters.'
    return
  }
  const token = auth.token
  changingPassword.value = true
  try {
    const result = await AdminProfileService.changePassword({
      currentPassword: passwords.current,
      newPassword: passwords.next,
    })
    if (sessionMatches(token)) {
      clearPasswords()
      passwordSuccess.value = result.message
    }
  } catch (cause) {
    if (sessionMatches(token))
      passwordError.value = message(cause, 'Unable to change your password. Please try again.')
  } finally {
    if (active) changingPassword.value = false
  }
}
watch(
  () => [auth.currentUser?.id, auth.currentUser?.role],
  () => {
    controller?.abort()
    profile.value = null
    Object.assign(form, { username: '', email: '', phone: '', avatarUrl: '' })
    clearPasswords()
    loadError.value =
      profileError.value =
      profileSuccess.value =
      passwordError.value =
      passwordSuccess.value =
        ''
    if (auth.isAuthenticated && auth.isAdmin) void load()
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  active = false
  controller?.abort()
  clearPasswords()
})
</script>

<template>
  <section class="max-w-4xl" :aria-busy="busy">
    <h1 class="text-3xl font-bold">Administrator profile</h1>
    <p class="mt-2 text-slate-600">Manage your account details and password.</p>
    <p v-if="loading" role="status" class="mt-6">Loading profile…</p>
    <div v-else-if="loadError" class="mt-6">
      <p role="alert" class="text-rose-700">{{ loadError }}</p>
      <button type="button" class="mt-3 text-indigo-700 underline" @click="load">Try again</button>
    </div>
    <div v-else-if="profile" class="mt-7 grid gap-6 xl:grid-cols-2">
      <form class="rounded-xl border border-slate-200 bg-white p-6" @submit.prevent="save">
        <h2 class="text-xl font-semibold">Profile information</h2>
        <p class="mt-2 text-sm text-slate-500">
          Administrator · Joined {{ new Date(profile.createdAt).toLocaleDateString() }}
        </p>
        <p v-if="profileSuccess" role="status" class="mt-4 text-emerald-700">
          {{ profileSuccess }}
        </p>
        <p v-if="profileError" role="alert" class="mt-4 text-rose-700">{{ profileError }}</p>
        <fieldset :disabled="busy" class="mt-5 space-y-4 disabled:opacity-60">
          <legend class="sr-only">Edit your profile</legend>
          <div>
            <label for="admin-name" class="block text-sm font-medium">Full name</label
            ><input
              id="admin-name"
              v-model="form.username"
              required
              minlength="2"
              maxlength="100"
              autocomplete="name"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <div>
            <label for="admin-email" class="block text-sm font-medium">Email address</label
            ><input
              id="admin-email"
              v-model="form.email"
              type="email"
              required
              maxlength="255"
              autocomplete="email"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <div>
            <label for="admin-phone" class="block text-sm font-medium">Phone (optional)</label
            ><input
              id="admin-phone"
              v-model="form.phone"
              type="tel"
              maxlength="20"
              autocomplete="tel"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <div>
            <label for="admin-avatar" class="block text-sm font-medium">Avatar URL (optional)</label
            ><input
              id="admin-avatar"
              v-model="form.avatarUrl"
              type="url"
              maxlength="500"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">
            {{ saving ? 'Saving…' : 'Save profile' }}
          </button>
        </fieldset>
      </form>
      <form
        class="self-start rounded-xl border border-slate-200 bg-white p-6"
        @submit.prevent="changePassword"
      >
        <h2 class="text-xl font-semibold">Change password</h2>
        <p class="mt-2 text-sm text-slate-500">
          Use 6–100 characters and choose a different password.
        </p>
        <p v-if="passwordSuccess" role="status" class="mt-4 text-emerald-700">
          {{ passwordSuccess }}
        </p>
        <p v-if="passwordError" role="alert" class="mt-4 text-rose-700">{{ passwordError }}</p>
        <fieldset :disabled="busy" class="mt-5 space-y-4 disabled:opacity-60">
          <legend class="sr-only">Change your password</legend>
          <div>
            <label for="admin-current-password" class="block text-sm font-medium"
              >Current password</label
            ><input
              id="admin-current-password"
              v-model="passwords.current"
              type="password"
              required
              autocomplete="current-password"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <div>
            <label for="admin-new-password" class="block text-sm font-medium">New password</label
            ><input
              id="admin-new-password"
              v-model="passwords.next"
              type="password"
              required
              minlength="6"
              maxlength="100"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <div>
            <label for="admin-confirm-password" class="block text-sm font-medium"
              >Confirm new password</label
            ><input
              id="admin-confirm-password"
              v-model="passwords.confirm"
              type="password"
              required
              minlength="6"
              maxlength="100"
              autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2"
            />
          </div>
          <button type="submit" class="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">
            {{ changingPassword ? 'Changing…' : 'Change password' }}
          </button>
        </fieldset>
      </form>
    </div>
  </section>
</template>
