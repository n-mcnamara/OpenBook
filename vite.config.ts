import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/OpenBook/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://openlibrary.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/blossom': {
        target: 'https://blossom.rip',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/blossom/, ''),
      },
    },
  },
})