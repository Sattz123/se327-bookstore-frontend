<script setup lang="ts">
import { isAxiosError } from 'axios'
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { piniaSymbol } from 'pinia'
import BookCover from '@/components/BookCover.vue'
import AddToCartForm from '@/components/AddToCartForm.vue'
import ProductService from '@/services/ProductService'
import type { Product } from '@/types/catalog'
import { formatLabels, formatPrice } from '@/utils/catalog'
import { useAuthStore } from '@/stores/auth'
import { useWishlistStore } from '@/stores/wishlist'

const route = useRoute()
const router = useRouter()
const hasPinia = inject(piniaSymbol, null) !== null
const authStore = hasPinia ? useAuthStore() : null
const wishlistStore = hasPinia ? useWishlistStore() : null

const isSaved = computed(() => {
  return product.value && wishlistStore ? wishlistStore.hasItem(product.value.id) : false
})

async function handleToggleWishlist() {
  if (!product.value) return
  if (!authStore?.isAuthenticated) {
    if (router) {
      await router.push({ name: 'login' })
    }
    return
  }
  if (wishlistStore) {
    await wishlistStore.toggleWishlist(product.value)
  }
}

const product = ref<Product | null>(null)
const loading = ref(true)
const error = ref<'missing' | 'unavailable' | null>(null)
const selectedImage = ref(0)
let controller: AbortController | undefined

async function loadProduct() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  product.value = null
  error.value = null
  selectedImage.value = 0
  loading.value = true
  const id = String(route.params.id)
  if (!/^[1-9]\d*$/.test(id)) {
    error.value = 'missing'
    loading.value = false
    return
  }
  try {
    const response = await ProductService.getProduct(id, request.signal)
    if (!request.signal.aborted) product.value = response.data
  } catch (cause) {
    if (!request.signal.aborted) {
      error.value =
        isAxiosError(cause) && cause.response?.status === 404 ? 'missing' : 'unavailable'
    }
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

watch(() => route.params.id, loadProduct, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading">
    <RouterLink
      :to="{ name: 'products' }"
      class="text-sm font-semibold text-indigo-700 hover:underline"
    >
      &larr; Back to books
    </RouterLink>

    <p v-if="loading" role="status" class="mt-10 text-slate-600">Loading book…</p>
    <div v-else-if="error" class="mt-8 rounded-xl border border-slate-200 bg-white p-8">
      <h1 class="text-3xl font-bold">
        {{ error === 'missing' ? 'Book not found' : 'Unable to load book' }}
      </h1>
      <p role="alert" class="mt-4 text-slate-600">
        {{
          error === 'missing'
            ? 'This book is unavailable or no longer listed.'
            : "We couldn't load this book. Please try again."
        }}
      </p>
      <button
        v-if="error === 'unavailable'"
        type="button"
        class="mt-5 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800"
        @click="loadProduct"
      >
        Try again
      </button>
    </div>
    <div v-else-if="product" class="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
      <div class="mx-auto w-full max-w-sm">
        <BookCover :image="product.images[selectedImage]" :name="product.name" />
        <div v-if="product.images.length > 1" class="mt-4 flex gap-3" aria-label="Book covers">
          <button
            v-for="(image, index) in product.images"
            :key="index"
            type="button"
            :aria-label="`View cover ${index + 1}`"
            :aria-pressed="selectedImage === index"
            class="w-16 rounded-lg border-2 p-1"
            :class="selectedImage === index ? 'border-indigo-700' : 'border-transparent'"
            @click="selectedImage = index"
          >
            <BookCover :image="image" :name="product.name" />
          </button>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold tracking-wide text-indigo-700">
          {{ product.category.name }}
        </p>
        <h1 class="mt-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {{ product.name }}
        </h1>
        <p class="mt-3 text-lg text-slate-600">By {{ product.author || 'Unknown author' }}</p>
        <p class="mt-6 text-3xl font-bold text-indigo-800">{{ formatPrice(product.price) }}</p>
        <p
          class="mt-3 font-medium"
          :class="product.stockQuantity > 0 ? 'text-emerald-700' : 'text-slate-500'"
        >
          {{
            product.stockQuantity > 0 ? `${product.stockQuantity} copies available` : 'Out of stock'
          }}
        </p>
        <div class="mt-6">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition"
            :class="
              isSaved
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            "
            :aria-label="isSaved ? 'Remove from wishlist' : 'Save to wishlist'"
            @click="handleToggleWishlist"
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
              class="h-5 w-5 stroke-current fill-none text-slate-400"
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
            <span>{{ isSaved ? 'Saved in wishlist' : 'Save to wishlist' }}</span>
          </button>
        </div>
        <AddToCartForm :key="product.id" :product="product" />
        <h2 class="mt-8 text-lg font-semibold">About this book</h2>
        <p class="mt-3 leading-relaxed whitespace-pre-line text-slate-600">
          {{ product.description || 'No description available.' }}
        </p>
        <h2 class="mt-8 text-lg font-semibold">Available formats</h2>
        <ul
          v-if="product.formats.length"
          class="mt-3 flex flex-wrap gap-2"
          aria-label="Available formats"
        >
          <li
            v-for="format in product.formats"
            :key="format"
            class="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-800"
          >
            {{ formatLabels[format] }}
          </li>
        </ul>
        <p v-else class="mt-3 text-slate-500">No formats listed.</p>
      </div>
    </div>
  </section>
</template>
