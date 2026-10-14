<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CategoryGrid from '@/components/CategoryGrid.vue'
import CategoryService from '@/services/CategoryService'
import type { Category } from '@/types/catalog'

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref(false)
let controller: AbortController | undefined

async function loadCategories() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = false
  try {
    const response = await CategoryService.getCategories(request.signal)
    if (!request.signal.aborted) categories.value = response.data
  } catch {
    if (!request.signal.aborted) error.value = true
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}

onMounted(loadCategories)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section :aria-busy="loading" class="category-page">
    <div class="category-page-heading">
      <h1>Shop by category</h1>
      <p>Browse our curated collection of books by category. Find your next great read.</p>
    </div>
    <p v-if="loading" role="status" class="mt-8 text-slate-600">Loading categories…</p>
    <div
      v-else-if="error"
      role="alert"
      class="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6"
    >
      <p>We couldn't load the categories.</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white"
        @click="loadCategories"
      >
        Try again
      </button>
    </div>
    <p v-else-if="!categories.length" role="status" class="mt-8 text-slate-600">
      No categories available yet.
    </p>
    <CategoryGrid v-else :categories="categories" variant="collection" />
  </section>
</template>
