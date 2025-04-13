import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy:{
      '/api/ds/query': {
        target: 'https://g-36c53baaa0.grafana-workspace.eu-central-1.amazonaws.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
