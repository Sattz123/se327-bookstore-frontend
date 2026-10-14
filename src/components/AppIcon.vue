<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  book: 'M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-3H4V3Zm16 0h-4a3 3 0 0 0-3 3v15a4 4 0 0 1 4-3h3V3Z',
  search: 'm21 21-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  cart: 'M2 3h3l3 13h11l3-9H6M10 21h.01M18 21h.01',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  chevron: 'm8 10 4 4 4-4',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  category: 'M3 3h7v7H3V3Zm14 0 5 7H12l5-7ZM8 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-3h9v7h-9v-7Z',
  orders: 'M6 3h12v19l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3',
  users:
    'M16 21v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm3-3a4 4 0 0 1 0 8m3 3a5 5 0 0 1 3 5v2',
  store:
    'M3 10v11h18V10M2 10l2-7h16l2 7M8 21v-7h8v7M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0',
  logout: 'M9 3H3v18h6m5-15 6 6-6 6M8 12h12',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'm6 6 12 12M6 18 18 6',
  upload: 'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',
  image: 'M3 3h18v18H3V3Zm0 14 5-5 4 4 4-6 5 7M9 7h.01',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name] || paths.book" />
  </svg>
</template>
