<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section>
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{{ title }}</h1>
    <p class="mt-3 max-w-2xl leading-relaxed text-slate-600">{{ description }}</p>
    <div
      class="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
    >
      <h2 class="text-lg font-semibold text-slate-900">Coming soon</h2>
      <p class="mt-2 text-slate-600">We're getting this section ready. Please check back soon.</p>
    </div>
  </section>
</template>
