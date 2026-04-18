import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths so built assets work at any deployment subpath
  // (GitHub Pages under /repo-name/, custom domain root, etc.)
  base: './',
})
