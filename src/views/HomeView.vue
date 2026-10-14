<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-12 sm:px-12 sm:py-20">
    <p class="mb-4 text-sm font-semibold tracking-widest text-indigo-700 uppercase">
      InwZa Bookstore
    </p>
    <h1
      class="max-w-2xl text-4xl leading-tight font-bold tracking-tight text-slate-900 sm:text-5xl"
    >
      Find your next great read.
    </h1>
    <p class="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
      Welcome to InwZa Bookstore. A new chapter is coming soon.
    </p>
    <RouterLink
      :to="{ name: 'products' }"
      class="mt-8 inline-flex rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-800"
    >
      Browse books <span aria-hidden="true" class="ml-2">&rarr;</span>
    </RouterLink>
  </section>
</template>
