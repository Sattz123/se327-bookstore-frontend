<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="py-12 text-center">
    <p class="text-sm font-bold tracking-widest text-indigo-700">404</p>
    <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Page not found</h1>
    <p class="mx-auto mt-4 max-w-md leading-relaxed text-slate-600">
      The page you're looking for doesn't exist. Head back to the bookstore to continue.
    </p>
    <RouterLink
      :to="{ name: 'home' }"
      class="mt-8 inline-flex rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
    >
      Back to home
    </RouterLink>
  </section>
</template>
