import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'app/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // Se mide el código de la aplicación, no la configuración ni los tipos.
      include: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/global-error.tsx',
      ],
      // El umbral se sube a 90 a medida que se cubren los módulos pendientes.
      thresholds: {
        lines: Number(process.env.COVERAGE_MIN ?? 0),
        statements: Number(process.env.COVERAGE_MIN ?? 0),
        functions: Number(process.env.COVERAGE_MIN ?? 0),
        branches: Number(process.env.COVERAGE_MIN ?? 0),
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
