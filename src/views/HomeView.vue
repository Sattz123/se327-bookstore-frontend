<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BookCard from '@/components/BookCard.vue'
import CategoryGrid from '@/components/CategoryGrid.vue'
import StoreFaqList from '@/components/StoreFaqList.vue'
import ProductService from '@/services/ProductService'
import CategoryService from '@/services/CategoryService'
import type { Product, Category } from '@/types/catalog'
const featured = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref(false)
let controller: AbortController | undefined
async function loadHome() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = false
  try {
    const [books, topics] = await Promise.all([
      ProductService.getFeaturedProducts(request.signal),
      CategoryService.getCategories(request.signal),
    ])
    if (!request.signal.aborted) {
      featured.value = books.data
      categories.value = topics.data
    }
  } catch {
    if (!request.signal.aborted) error.value = true
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
onMounted(loadHome)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div>
    <section class="store-hero">
      <div>
        <span class="store-hero-kicker">Welcome to InwZa Bookstore</span>
        <h1>
          Find your next<br class="hidden sm:block" />
          great read.
        </h1>
        <p>
          Stories to get lost in. Ideas to grow with.<br />Discover something worth turning the page
          for.
        </p>
        <div class="hero-actions">
          <RouterLink :to="{ name: 'products' }">Shop books</RouterLink
          ><RouterLink :to="{ name: 'categories' }">Explore categories</RouterLink>
        </div>
      </div>
    </section>
    <div :aria-busy="loading">
      <p v-if="loading" role="status" class="py-16 text-center text-sm text-slate-500">
        Loading the latest books…
      </p>
      <div
        v-else-if="error"
        role="alert"
        class="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center"
      >
        <p>We couldn't load the books and categories.</p>
        <button
          type="button"
          class="mt-4 text-sm font-medium text-indigo-700 underline"
          @click="loadHome"
        >
          Try again
        </button>
      </div>
      <template v-else>
        <section aria-labelledby="featured-heading" class="store-section">
          <div class="store-section-heading">
            <span>Fresh on the shelves</span>
            <h2 id="featured-heading">Discover your next favorite</h2>
            <p>A few of the latest additions to our collection.</p>
          </div>
          <ul
            v-if="featured.length"
            aria-label="Featured books"
            class="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 lg:grid-cols-4"
          >
            <li v-for="product in featured" :key="product.id"><BookCard :product="product" /></li>
          </ul>
          <p v-else class="text-center text-sm text-slate-500">No books available yet.</p>
          <RouterLink :to="{ name: 'products' }" class="store-section-link"
            >View all books <AppIcon name="arrow" :size="17"
          /></RouterLink>
        </section>
        <section aria-labelledby="topics-heading" class="store-section">
          <div class="store-section-heading">
            <span>Something for everyone</span>
            <h2 id="topics-heading">Browse by category</h2>
            <p>Follow your curiosity. Find a shelf that feels like you.</p>
          </div>
          <CategoryGrid v-if="categories.length" :categories="categories" />
          <p v-else class="text-center text-sm text-slate-500">No categories available yet.</p>
        </section>
      </template>
    </div>
    <section class="store-section mx-auto max-w-3xl" aria-labelledby="home-help-heading">
      <div class="store-section-heading">
        <span>A little help</span>
        <h2 id="home-help-heading">Good questions, simple answers</h2>
      </div>
      <StoreFaqList :limit="2" />
    </section>
    <section class="store-help-strip">
      <div>
        <h2>Need a hand finding something?</h2>
        <p>We're here for your book questions and order enquiries.</p>
      </div>
      <RouterLink :to="{ name: 'contact' }"
        >Get in touch <AppIcon name="arrow" :size="17"
      /></RouterLink>
    </section>
  </div>
</template>
