<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="py-10">
    <h1 class="text-3xl font-bold">Administrator access required</h1>
    <p class="mt-4 text-slate-600">
      Your account does not have permission to open the back office.
    </p>
    <div class="mt-6 flex flex-wrap gap-5">
      <RouterLink :to="{ name: 'admin-login' }" class="font-semibold text-indigo-700 underline"
        >Sign in with an administrator account</RouterLink
      >
      <RouterLink :to="{ name: 'home' }" class="font-semibold text-indigo-700 underline"
        >Return to storefront</RouterLink
      >
    </div>
  </section>
</template>
