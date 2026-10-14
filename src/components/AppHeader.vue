<script setup lang="ts">
import { computed, inject } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { piniaSymbol } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const hasPinia = inject(piniaSymbol, null) !== null
const authStore = hasPinia ? useAuthStore() : null

const links = [
  { name: 'home', label: 'Home' },
  { name: 'products', label: 'Books' },
  { name: 'categories', label: 'Categories' },
  { name: 'contact', label: 'Contact' },
]

const isAuthenticated = computed(() => authStore?.isAuthenticated ?? false)
const isAdmin = computed(() => authStore?.isAdmin ?? false)
const currentUser = computed(() => authStore?.currentUser ?? null)

async function handleLogout() {
  if (authStore) {
    await authStore.logout()
  }
  await router.push({ name: 'home' })
}
</script>

<template>
  <header class="border-b border-slate-200 bg-white">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
    >
      <RouterLink
        :to="{ name: 'home' }"
        class="w-fit text-xl font-bold tracking-tight text-slate-900"
      >
        InwZa <span class="text-indigo-700">Bookstore</span>
      </RouterLink>
      <div class="flex flex-wrap items-center gap-4">
        <nav aria-label="Main navigation" class="flex flex-wrap gap-1">
          <RouterLink
            v-for="link in links"
            :key="link.name"
            :to="{ name: link.name }"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            exact-active-class="bg-indigo-50 text-indigo-800"
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <div
          class="flex items-center gap-2 border-t border-slate-200 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0"
        >
          <template v-if="isAuthenticated">
            <RouterLink
              :to="{ name: 'profile' }"
              class="rounded-lg px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              exact-active-class="bg-indigo-50 text-indigo-800"
            >
              Hi, {{ currentUser?.username }}
            </RouterLink>
            <span
              v-if="isAdmin"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
            >
              Admin
            </span>
            <button
              type="button"
              class="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              @click="handleLogout"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <RouterLink
              :to="{ name: 'login' }"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              exact-active-class="bg-indigo-50 text-indigo-800"
            >
              Sign in
            </RouterLink>
            <RouterLink
              :to="{ name: 'register' }"
              class="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              Register
            </RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
