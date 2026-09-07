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
      // Piso, no objetivo: son los valores ya alcanzados, así que la cobertura
      // sólo puede subir. Lo que falta para el 90% del plan es la capa de UI
      // (páginas de app/(dashboard), src/features/*/ui, widgets y shared/ui);
      // el BFF y las capas de datos y aplicación ya están cubiertos.
      // COVERAGE_MIN fuerza un único mínimo para las cuatro métricas.
      thresholds: {
        lines: Number(process.env.COVERAGE_MIN ?? 37),
        statements: Number(process.env.COVERAGE_MIN ?? 37),
        functions: Number(process.env.COVERAGE_MIN ?? 83),
        branches: Number(process.env.COVERAGE_MIN ?? 90),
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
