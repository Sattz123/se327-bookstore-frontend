<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const navigationOpen = ref(false)
const signingOut = ref(false)
const menuToggle = ref<HTMLButtonElement | null>(null)
const sidebar = ref<HTMLElement | null>(null)
let desktopQuery: MediaQueryList | undefined
function handleDesktopChange() {
  if (desktopQuery?.matches) navigationOpen.value = false
}
onMounted(() => {
  desktopQuery = window.matchMedia('(min-width: 851px)')
  desktopQuery.addEventListener('change', handleDesktopChange)
})
onBeforeUnmount(() => desktopQuery?.removeEventListener('change', handleDesktopChange))
async function toggleNavigation() {
  navigationOpen.value = !navigationOpen.value
  await nextTick()
  if (navigationOpen.value)
    sidebar.value?.querySelector<HTMLAnchorElement>('.admin-nav-link')?.focus()
  else menuToggle.value?.focus()
}
function closeNavigation() {
  navigationOpen.value = false
  menuToggle.value?.focus()
}
const links = [
  { name: 'admin-home', label: 'Overview', icon: 'grid' },
  { name: 'admin-products', label: 'Products & inventory', icon: 'book' },
  { name: 'admin-categories', label: 'Categories', icon: 'category' },
  { name: 'admin-orders', label: 'Orders', icon: 'orders' },
  { name: 'admin-customers', label: 'Customers', icon: 'users' },
]
const pageTitle = computed(() =>
  route.name === 'admin-order-detail'
    ? 'Order details'
    : route.name === 'admin-profile'
      ? 'My profile'
      : links.find((link) => link.name === route.name)?.label || 'Overview',
)
function selected(name: string) {
  return route.name === name || (name === 'admin-orders' && route.name === 'admin-order-detail')
}
watch(
  () => route.fullPath,
  () => {
    navigationOpen.value = false
  },
)
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
  if (signingOut.value) return
  signingOut.value = true
  try {
    await auth.logout()
  } catch {
    auth.clearAuth()
  } finally {
    signingOut.value = false
  }
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div
    v-if="auth.isAuthenticated && auth.isAdmin"
    class="admin-shell"
    @keydown.esc="closeNavigation"
  >
    <button
      v-if="navigationOpen"
      type="button"
      class="admin-nav-backdrop"
      aria-label="Close administrator navigation"
      @click="closeNavigation"
    />
    <aside
      ref="sidebar"
      id="admin-navigation"
      class="admin-sidebar"
      :class="{ 'is-open': navigationOpen }"
    >
      <RouterLink :to="{ name: 'admin-home' }" class="admin-brand"
        ><span class="admin-brand-icon"><AppIcon name="book" :size="24" /></span
        ><span><strong>InwZa Bookstore</strong><small>Administration</small></span></RouterLink
      >
      <p class="admin-nav-heading">Store management</p>
      <nav aria-label="Administrator navigation" class="admin-navigation">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="{ name: link.name }"
          class="admin-nav-link"
          :class="{ 'is-active': selected(link.name) }"
          ><AppIcon :name="link.icon" :size="20" /><span>{{ link.label }}</span></RouterLink
        >
      </nav>
      <div class="admin-sidebar-bottom">
        <RouterLink
          :to="{ name: 'admin-profile' }"
          class="admin-nav-link"
          :class="{ 'is-active': route.name === 'admin-profile' }"
          ><AppIcon name="user" /><span>My profile</span></RouterLink
        >
        <RouterLink :to="{ name: 'home' }" class="admin-nav-link"
          ><AppIcon name="store" /><span>Go to storefront</span><AppIcon name="arrow" :size="15"
        /></RouterLink>
        <button type="button" class="admin-nav-link" :disabled="signingOut" @click="logout">
          <AppIcon name="logout" /><span>{{ signingOut ? 'Signing out…' : 'Sign out' }}</span>
        </button>
      </div>
    </aside>
    <div class="admin-workspace" :inert="navigationOpen || undefined">
      <header class="admin-topbar">
        <div class="admin-topbar-title">
          <button
            type="button"
            class="admin-menu-toggle"
            ref="menuToggle"
            :aria-expanded="navigationOpen"
            aria-controls="admin-navigation"
            aria-label="Toggle administrator navigation"
            @click="toggleNavigation"
          >
            <AppIcon :name="navigationOpen ? 'close' : 'menu'" /></button
          ><span class="admin-breadcrumb-parent">Back office</span
          ><span class="admin-breadcrumb-divider">/</span><span>{{ pageTitle }}</span>
        </div>
        <RouterLink :to="{ name: 'admin-profile' }" class="admin-user"
          ><span class="admin-avatar">{{
            auth.currentUser?.username?.charAt(0).toUpperCase() || 'A'
          }}</span
          ><span
            ><strong>{{ auth.currentUser?.username }}</strong
            ><small>Administrator</small></span
          ></RouterLink
        >
      </header>
      <main id="main-content" tabindex="-1" class="admin-content"><RouterView /></main>
      <footer class="admin-footer"><span>InwZa Bookstore</span><span>Administration</span></footer>
    </div>
  </div>
</template>
