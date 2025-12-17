import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
  optimizeDeps: {
    exclude: ['@webcontainer/api'],
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    cors: true,
    proxy: {
      '/api/hf': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => {
          // Rewrite /api/hf/models/ModelName to /models/ModelName
          const newPath = path.replace(/^\/api\/hf/, '');
          console.log(`[Proxy] Rewriting ${path} to ${newPath}`);
          return newPath;
        },
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Proxy] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Proxy] Proxying request to:', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Proxy] Response status:', proxyRes.statusCode, 'for', req.url);
          });
        },
      },
      // Direct HuggingFace API proxy
      '/hf-api': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf-api/, ''),
        secure: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    },
  },
})
