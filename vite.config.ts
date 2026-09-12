/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Агент віддає /api/v1/* на 8000. Проксі, а не прямий URL: сторінка
    // лишається same-origin, тож CORS у бекенді не потрібен узагалі.
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Тести працюють на фікстурах: джерело даних — питання запуску, а не
    // предмет тесту, і жоден тест не має ходити в мережу.
    env: { VITE_API_MODE: 'mock' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/entities/**/lib/**', 'src/shared/lib/**'],
    },
  },
});
