import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves at: https://prabhu-omkar.github.io/IndiaMap/
export default defineConfig({
  plugins: [react()],
  base: '/IndiaMap/',
})
