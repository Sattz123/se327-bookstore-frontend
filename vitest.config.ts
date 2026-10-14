import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/types/**',
        'src/main.ts',
        'src/data/**',
        'src/views/AdminProductsView.vue',
        'src/views/AdminOrdersView.vue',
        'src/views/AdminProfileView.vue',
        'src/views/AdminCategoriesView.vue',
        'src/views/AdminCustomersView.vue',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
})
