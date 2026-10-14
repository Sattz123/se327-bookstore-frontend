<script setup lang="ts">
import { RouterLink } from 'vue-router'

const links = [
  { name: 'home', label: 'Home' },
  { name: 'products', label: 'Books' },
  { name: 'categories', label: 'Categories' },
  { name: 'contact', label: 'Contact' },
]
</script>

<template>
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <RouterLink :to="{ name: 'home' }" class="w-fit text-xl font-bold tracking-tight text-slate-900">
        InwZa <span class="text-indigo-700">Bookstore</span>
      </RouterLink>
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
    </div>
  </header>
</template>
