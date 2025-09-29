// vite.config.ts
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.', 
  base: './',  
  server: {
    open: '/calculadora.html',
    port: 5173
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'calculadora.html'),
      }
    }
  },
  resolve: {
    alias: {
    }
  }
})
