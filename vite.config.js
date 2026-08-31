import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes every built asset reference relative, so the site works
// unmodified whether it's served from a domain root or a GitHub Pages project
// subpath (https://user.github.io/repo-name/) — no need to hardcode the repo
// name here.
export default defineConfig({
  base: './',
  plugins: [react()],
})
