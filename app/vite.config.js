import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  for (const key of required) {
    if (!env[key]) throw new Error(`Build aborted: missing required env var ${key}`)
  }
  return { plugins: [react()] }
})
