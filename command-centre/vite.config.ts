import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // MapLibre ships its worker as a sibling module; excluding it prevents Vite's
  // dependency optimizer from moving the entry without its worker.
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
