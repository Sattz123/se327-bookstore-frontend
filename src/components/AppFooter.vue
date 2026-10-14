<script setup lang="ts">
import { RouterLink } from 'vue-router'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-slate-200 bg-white">
    <div class="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p>&copy; {{ year }} InwZa Bookstore. All rights reserved.</p>
      <nav aria-label="Footer navigation" class="flex flex-wrap gap-5">
        <RouterLink :to="{ name: 'products' }" class="hover:text-indigo-700">Browse books</RouterLink>
        <RouterLink :to="{ name: 'contact' }" class="hover:text-indigo-700">Contact</RouterLink>
      </nav>
    </div>
  </footer>
</template>
