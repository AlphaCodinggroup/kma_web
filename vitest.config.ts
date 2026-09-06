import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [] },
  },
  test: {
    exclude: [
      "e2e/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
    ],
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage/all',
      include: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/*.{test,spec}.{ts,tsx}',
        '**/__tests__/**',
        '**/types/**',
        '**/*.types.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@processes': path.resolve(__dirname, './src/processes'),
      '@components': path.resolve(__dirname, './src/components'),
      '@app': path.resolve(__dirname, './app'),
    },
  },
})
