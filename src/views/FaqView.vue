<script setup lang="ts">
import StoreFaqList from '@/components/StoreFaqList.vue'
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <h1 class="text-3xl font-bold sm:text-4xl">Frequently asked questions</h1>
    <p class="mt-3 text-slate-600">
      Help with orders, payments, delivery and your account. Select a question to read the answer.
    </p>
    <div class="mt-8"><StoreFaqList /></div>
    <div class="mt-8 rounded-xl bg-indigo-50 p-6">
      <h2 class="text-xl font-semibold">Still need help?</h2>
      <RouterLink
        :to="{ name: 'contact' }"
        class="mt-3 inline-block font-semibold text-indigo-700 underline"
        >Contact the store</RouterLink
      >
    </div>
  </section>
</template>
