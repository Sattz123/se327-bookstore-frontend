<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { piniaSymbol } from 'pinia'
import BookCover from '@/components/BookCover.vue'
import type { Product } from '@/types/catalog'
import { formatPrice } from '@/utils/catalog'
import { useAuthStore } from '@/stores/auth'
import { useWishlistStore } from '@/stores/wishlist'

const props = defineProps<{ product: Product }>()
const wishlistBusy = ref(false)
const wishlistError = ref('')

const hasPinia = inject(piniaSymbol, null) !== null
const authStore = hasPinia ? useAuthStore() : null
const wishlistStore = hasPinia ? useWishlistStore() : null

let router: ReturnType<typeof useRouter> | null = null
try {
  router = useRouter()
} catch {
  router = null
}

const isSaved = computed(() => {
  return wishlistStore ? wishlistStore.hasItem(props.product.id) : false
})

async function handleToggleWishlist() {
  if (wishlistBusy.value) return
  wishlistError.value = ''
  if (!authStore?.isAuthenticated) {
    if (router) {
      await router.push({ name: 'login' })
    }
    return
  }
  if (wishlistStore) {
    wishlistBusy.value = true
    try {
      await wishlistStore.toggleWishlist(props.product)
    } catch {
      wishlistError.value = 'Unable to update your wishlist. Please try again.'
    } finally {
      wishlistBusy.value = false
    }
  }
}
</script>

<template>
  <article
    class="relative flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
  >
    <button
      type="button"
      :disabled="wishlistBusy"
      :aria-pressed="isSaved"
      :aria-label="isSaved ? 'Remove from wishlist' : 'Save to wishlist'"
      :title="isSaved ? 'Remove from wishlist' : 'Save to wishlist'"
      class="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs transition hover:scale-110 disabled:opacity-50"
      @click.stop.prevent="handleToggleWishlist"
    >
      <svg
        v-if="isSaved"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 fill-current text-red-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
          clip-rule="evenodd"
        />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 stroke-current fill-none text-slate-400 hover:text-red-500"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
    <RouterLink
      :to="{ name: 'product-detail', params: { id: product.id } }"
      class="flex flex-1 flex-col rounded-xl p-4"
    >
      <BookCover :image="product.images[0]" :name="product.name" />
      <p class="mt-4 text-xs font-semibold tracking-wide text-indigo-700">
        {{ product.category.name }}
      </p>
      <h2 class="mt-2 text-lg leading-snug font-semibold">{{ product.name }}</h2>
      <p class="mt-1 text-sm text-slate-600">{{ product.author || 'Unknown author' }}</p>
      <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <p class="font-bold text-indigo-800">{{ formatPrice(product.price) }}</p>
        <p v-if="product.stockQuantity === 0" class="text-xs font-medium text-slate-500">
          Out of stock
        </p>
      </div>
    </RouterLink>
    <p v-if="wishlistError" role="alert" class="px-4 pb-4 text-sm text-rose-700">
      {{ wishlistError }}
    </p>
  </article>
</template>
