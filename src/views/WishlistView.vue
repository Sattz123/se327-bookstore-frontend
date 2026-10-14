<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { piniaSymbol } from 'pinia'
import BookCover from '@/components/BookCover.vue'
import { useWishlistStore } from '@/stores/wishlist'
import { formatPrice } from '@/utils/catalog'

const hasPinia = inject(piniaSymbol, null) !== null
const wishlistStore = hasPinia ? useWishlistStore() : null

const removingId = ref<number | null>(null)
const items = computed(() => wishlistStore?.items ?? [])
const isLoading = computed(() => wishlistStore?.isLoading ?? false)
const count = computed(() => wishlistStore?.count ?? 0)

onMounted(async () => {
  if (wishlistStore) {
    await wishlistStore.fetchWishlist()
  }
})

async function handleRemove(productId: number) {
  if (!wishlistStore) return
  removingId.value = productId
  try {
    await wishlistStore.removeFromWishlist(productId)
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl py-8">
    <div
      class="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4"
    >
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My Wishlist</h1>
        <p class="mt-1 text-sm text-slate-600">Books you've saved to read or purchase later.</p>
      </div>
      <span v-if="count > 0" class="text-sm font-medium text-slate-500">
        {{ count }} {{ count === 1 ? 'book' : 'books' }}
      </span>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && items.length === 0"
      role="status"
      class="py-12 text-center text-slate-500"
    >
      Loading your wishlist…
    </div>

    <!-- Empty State -->
    <div
      v-else-if="items.length === 0"
      class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center"
      data-testid="wishlist-empty"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="mx-auto h-12 w-12 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <h2 class="mt-4 text-lg font-semibold text-slate-900">Your wishlist is empty</h2>
      <p class="mt-1 text-sm text-slate-600">You haven't saved any books to your wishlist yet.</p>
      <div class="mt-6">
        <RouterLink
          :to="{ name: 'products' }"
          class="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          Explore books
        </RouterLink>
      </div>
    </div>

    <!-- Wishlist Items -->
    <div v-else class="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        data-testid="wishlist-item"
      >
        <div class="flex items-center gap-4">
          <RouterLink
            :to="{ name: 'product-detail', params: { id: item.product.id } }"
            class="h-24 w-18 shrink-0 overflow-hidden rounded-md border border-slate-200"
          >
            <BookCover :image="item.product.images[0]" :name="item.product.name" />
          </RouterLink>
          <div>
            <span class="text-xs font-semibold text-indigo-700">
              {{ item.product.category?.name }}
            </span>
            <h3 class="font-semibold text-slate-900">
              <RouterLink
                :to="{ name: 'product-detail', params: { id: item.product.id } }"
                class="hover:text-indigo-600"
              >
                {{ item.product.name }}
              </RouterLink>
            </h3>
            <p class="text-sm text-slate-600">{{ item.product.author || 'Unknown author' }}</p>
            <p class="mt-1 text-sm font-bold text-indigo-800">
              {{ formatPrice(item.product.price) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 sm:self-center">
          <RouterLink
            :to="{ name: 'product-detail', params: { id: item.product.id } }"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View details
          </RouterLink>
          <button
            type="button"
            :disabled="removingId === item.product.id"
            class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            :aria-label="`Remove ${item.product.name} from wishlist`"
            @click="handleRemove(item.product.id)"
          >
            {{ removingId === item.product.id ? 'Removing…' : 'Remove' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
