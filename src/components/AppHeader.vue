<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { piniaSymbol } from 'pinia'
import AppIcon from '@/components/AppIcon.vue'
import CategoryService from '@/services/CategoryService'
import { useAuthStore } from '@/stores/auth'
import { useWishlistStore } from '@/stores/wishlist'
import { useCartStore } from '@/stores/cart'
import type { Category } from '@/types/catalog'

const router = useRouter()
const route = useRoute()
const hasPinia = inject(piniaSymbol, null) !== null
const auth = hasPinia ? useAuthStore() : null
const wishlist = hasPinia ? useWishlistStore() : null
const cart = hasPinia ? useCartStore() : null
const categories = ref<Category[]>([])
const categoryState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const search = ref('')
const header = ref<HTMLElement | null>(null)
const signingOut = ref(false)
const isAuthenticated = computed(() => auth?.isAuthenticated ?? false)
const accountLinks = [
  { name: 'profile', label: 'My account' },
  { name: 'orders', label: 'My orders' },
  { name: 'wishlist', label: 'Wishlist' },
  { name: 'addresses', label: 'Addresses' },
  { name: 'payment-methods', label: 'Payment methods' },
]
const categoryRequest = new AbortController()
function closeMenus() {
  header.value?.querySelectorAll('details[open]').forEach((menu) => menu.removeAttribute('open'))
}
function outsideClick(event: PointerEvent) {
  if (!header.value?.contains(event.target as Node)) closeMenus()
}
function escapeMenu(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const menu = (event.target as HTMLElement).closest('details')
  closeMenus()
  menu?.querySelector('summary')?.focus()
}
async function loadCategories() {
  if (categoryState.value === 'loading' || categoryState.value === 'ready') return
  categoryState.value = 'loading'
  try {
    const response = await CategoryService.getCategories(categoryRequest.signal)
    if (!categoryRequest.signal.aborted) {
      categories.value = response.data
      categoryState.value = 'ready'
    }
  } catch {
    if (!categoryRequest.signal.aborted) categoryState.value = 'error'
  }
}
function toggleMenu(event: Event, categoryMenu = false) {
  const selected = event.target as HTMLDetailsElement
  if (selected.open) {
    header.value?.querySelectorAll('details[open]').forEach((menu) => {
      if (menu !== selected) menu.removeAttribute('open')
    })
    if (categoryMenu) void loadCategories()
  }
}
watch(
  () => route.fullPath,
  () => {
    search.value = typeof route.query.q === 'string' ? route.query.q : ''
    closeMenus()
  },
  { immediate: true },
)
watch(
  () => auth?.currentUser?.id,
  (id) => {
    wishlist?.clear()
    if (id) void wishlist?.fetchWishlist()
  },
  { immediate: true },
)
onMounted(() => {
  document.addEventListener('pointerdown', outsideClick)
})
onBeforeUnmount(() => {
  categoryRequest.abort()
  document.removeEventListener('pointerdown', outsideClick)
})
function submitSearch() {
  closeMenus()
  void router.push({ name: 'products', query: { q: search.value.trim() || undefined } })
}
async function logout() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await auth?.logout()
  } catch {
    auth?.clearAuth()
  } finally {
    wishlist?.clear()
    signingOut.value = false
  }
  closeMenus()
  await router.push({ name: 'home' })
}
</script>

<template>
  <header ref="header" class="store-header" @keydown="escapeMenu">
    <div class="store-header-inner">
      <nav aria-label="Main navigation" class="store-nav">
        <RouterLink :to="{ name: 'products' }" class="store-nav-link" active-class="is-current"
          >All Products</RouterLink
        >
        <details class="header-dropdown" @toggle="toggleMenu($event, true)">
          <summary>Categories <AppIcon name="chevron" :size="14" /></summary>
          <div class="header-menu">
            <RouterLink :to="{ name: 'categories' }">All categories</RouterLink>
            <p
              v-if="categoryState === 'loading'"
              role="status"
              class="px-3 py-2 text-xs text-slate-500"
            >
              Loading categories…
            </p>
            <button v-if="categoryState === 'error'" type="button" @click="loadCategories">
              Couldn't load categories. Retry
            </button>
            <RouterLink
              v-for="category in categories"
              :key="category.id"
              :to="{ name: 'category-products', params: { id: category.id } }"
              >{{ category.name }}</RouterLink
            >
          </div>
        </details>
        <details class="header-dropdown" @toggle="toggleMenu">
          <summary>More <AppIcon name="chevron" :size="14" /></summary>
          <div class="header-menu">
            <RouterLink :to="{ name: 'contact' }">Contact us</RouterLink>
            <RouterLink :to="{ name: 'faq' }">FAQ</RouterLink>
            <RouterLink :to="{ name: 'store-information' }">Store information</RouterLink>
          </div>
        </details>
      </nav>
      <RouterLink :to="{ name: 'home' }" class="store-wordmark" aria-label="InwZa Bookstore home"
        ><span>InwZa</span><small>BOOKSTORE</small></RouterLink
      >
      <div class="store-header-actions">
        <form
          class="header-search"
          role="search"
          aria-label="Search the bookstore"
          @submit.prevent="submitSearch"
        >
          <label for="header-search" class="sr-only">Search products</label>
          <input
            id="header-search"
            v-model="search"
            type="search"
            maxlength="100"
            placeholder="Search products…"
          />
          <button type="submit" aria-label="Search"><AppIcon name="search" :size="19" /></button>
        </form>
        <RouterLink
          :to="{ name: 'cart' }"
          class="header-cart"
          :aria-label="`Shopping cart, ${cart?.count ?? 0} ${cart?.count === 1 ? 'item' : 'items'}`"
          ><AppIcon name="cart" :size="23" /><span v-if="cart?.count" class="cart-count">{{
            cart.count
          }}</span></RouterLink
        >
        <details
          v-if="isAuthenticated"
          class="header-dropdown account-dropdown"
          @toggle="toggleMenu"
        >
          <summary class="account-trigger" aria-label="Your account">
            <AppIcon name="user" :size="18" /><span>Account</span
            ><AppIcon name="chevron" :size="13" />
          </summary>
          <div class="header-menu account-menu">
            <div class="menu-account">
              <strong>{{ auth?.currentUser?.username }}</strong
              ><small>{{ auth?.currentUser?.email }}</small>
            </div>
            <RouterLink v-for="link in accountLinks" :key="link.name" :to="{ name: link.name }"
              >{{ link.label
              }}<span v-if="link.name === 'wishlist' && wishlist?.count" class="menu-count">{{
                wishlist.count
              }}</span></RouterLink
            >
            <RouterLink v-if="auth?.isAdmin" :to="{ name: 'admin-home' }"
              >Back office <AppIcon name="arrow" :size="15"
            /></RouterLink>
            <button type="button" :disabled="signingOut" @click="logout">Sign out</button>
          </div>
        </details>
        <RouterLink v-else :to="{ name: 'login' }" class="header-login">Login</RouterLink>
      </div>
    </div>
  </header>
</template>
