import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import scraperApi from './plugins/scraperApi.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), scraperApi()],
})
