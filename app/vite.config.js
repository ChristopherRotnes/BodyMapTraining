import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { resolve } from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (mode !== 'test') {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
    for (const key of required) {
      if (!env[key]) throw new Error(`Build aborted: missing required env var ${key}`)
    }
  }
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@carbon/styles/css/styles.css': resolve(__dirname, 'node_modules/@carbon/styles/css/styles.css'),
      },
    },
    test: {
      environment: 'node',
    },
  }
})
