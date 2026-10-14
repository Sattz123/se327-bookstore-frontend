<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main-content"
      class="sr-only z-50 rounded bg-indigo-700 px-4 py-3 text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
    <AppHeader />
    <main id="main-content" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
