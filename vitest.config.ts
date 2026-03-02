import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      thresholds: {
        'src/lib/': { lines: 80, branches: 75, functions: 80 },
        'src/components/': { lines: 60, branches: 50, functions: 60 },
        'src/hooks/': { lines: 70, branches: 65, functions: 70 },
      },
    },
  },
})
