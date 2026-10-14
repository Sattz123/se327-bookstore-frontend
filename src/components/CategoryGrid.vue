<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Category } from '@/types/catalog'

defineProps<{ categories: Category[] }>()
</script>

<template>
  <ul aria-label="Book categories" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <li v-for="category in categories" :key="category.id">
      <RouterLink
        :to="{ name: 'category-products', params: { id: category.id } }"
        class="flex h-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 font-semibold transition-colors hover:border-indigo-300 hover:bg-indigo-50"
      >
        <span
          aria-hidden="true"
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl text-indigo-800"
          >{{ category.name.charAt(0) }}</span
        >
        <span>{{ category.name }}</span>
        <span aria-hidden="true" class="ml-auto text-indigo-700">&rarr;</span>
      </RouterLink>
    </li>
  </ul>
</template>
