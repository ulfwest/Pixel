import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
 const env = loadEnv(mode, process.cwd(), '')

 return {
 base: '/',
 plugins: [react(), tailwindcss()],
 resolve: {
 alias: {
 '@': path.resolve(__dirname, './src'),
 },
 },
 server: {
 host: '0.0.0.0',
 port: 3000,
 strictPort: true,
 },
 preview: {
 host: '0.0.0.0',
 port: 4173,
 strictPort: true,
 },
 }
})
