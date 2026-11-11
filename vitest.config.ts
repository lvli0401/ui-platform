import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: [
      'packages/**/src/**/*.{test,spec}.{ts,tsx}',
      'apps/**/src/**/*.{test,spec}.{ts,tsx}',
      'scripts/**/*.{test,spec}.{mjs,js,ts}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    passWithNoTests: true,
  },
})
