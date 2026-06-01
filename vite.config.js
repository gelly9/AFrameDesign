import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Repo name as base path so assets resolve on GitHub Pages
  // (https://gelly9.github.io/AFrameDesign/).
  base: '/AFrameDesign/',
  plugins: [react()],
})
