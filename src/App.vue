<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
const route = useRoute()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main-content"
      class="sr-only z-50 rounded bg-indigo-700 px-4 py-3 text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
    <RouterView v-if="route.meta.adminArea" />
    <AppHeader v-if="!route.meta.adminArea" />
    <main
      v-if="!route.meta.adminArea"
      id="main-content"
      tabindex="-1"
      class="storefront-main mx-auto w-full flex-1 px-5 sm:px-8"
      :class="{ 'storefront-home': route.name === 'home' }"
    >
      <RouterView />
    </main>
    <AppFooter v-if="!route.meta.adminArea" />
  </div>
</template>
