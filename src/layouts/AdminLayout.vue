<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

watch(
  () => [auth.isAuthenticated, auth.currentUser?.role],
  () => {
    if (!auth.isAuthenticated)
      void router.replace({ name: 'admin-login', query: { redirect: route.fullPath } })
    else if (!auth.isAdmin) void router.replace({ name: 'forbidden' })
  },
  { immediate: true, flush: 'sync' },
)

async function logout() {
  try {
    await auth.logout()
  } catch {
    auth.clearAuth()
  }
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div
    v-if="auth.isAuthenticated && auth.isAdmin"
    class="min-h-screen bg-slate-50 md:grid md:grid-cols-[15rem_1fr]"
  >
    <aside class="flex flex-col gap-6 bg-slate-900 px-6 py-7 text-white">
      <RouterLink :to="{ name: 'admin-home' }" class="text-xl font-bold"
        >InwZa Back Office</RouterLink
      >
      <p class="break-words text-sm text-slate-300">
        {{ auth.currentUser?.username }}<br />Administrator
      </p>
      <nav aria-label="Administrator navigation" class="flex flex-col gap-2">
        <RouterLink
          :to="{ name: 'admin-orders' }"
          class="rounded-lg px-3 py-2 hover:bg-slate-800"
          active-class="bg-indigo-700"
          >Orders</RouterLink
        >
        <RouterLink
          :to="{ name: 'admin-customers' }"
          class="rounded-lg px-3 py-2 hover:bg-slate-800"
          exact-active-class="bg-indigo-700"
          >Customers</RouterLink
        >
        <RouterLink
          :to="{ name: 'admin-categories' }"
          class="rounded-lg px-3 py-2 hover:bg-slate-800"
          exact-active-class="bg-indigo-700"
          >Categories</RouterLink
        >
        <RouterLink
          :to="{ name: 'admin-products' }"
          class="rounded-lg px-3 py-2 hover:bg-slate-800"
          exact-active-class="bg-indigo-700"
          >Products and inventory</RouterLink
        >
        <RouterLink
          :to="{ name: 'admin-home' }"
          class="rounded-lg px-3 py-2 hover:bg-slate-800"
          exact-active-class="bg-indigo-700"
          >Dashboard</RouterLink
        >
        <RouterLink :to="{ name: 'home' }" class="rounded-lg px-3 py-2 hover:bg-slate-800"
          >View storefront</RouterLink
        >
        <RouterLink
          :to="{ name: 'admin-profile' }"
          class="rounded-lg px-3 py-2 hover:bg-slate-800"
          exact-active-class="bg-indigo-700"
          >Admin profile</RouterLink
        >
      </nav>
      <button
        type="button"
        class="mt-auto rounded-lg border border-slate-600 px-3 py-2 text-left hover:bg-slate-800"
        @click="logout"
      >
        Sign out
      </button>
    </aside>
    <main id="main-content" tabindex="-1" class="min-w-0 px-6 py-8 md:px-10 md:py-10">
      <RouterView />
    </main>
  </div>
</template>
