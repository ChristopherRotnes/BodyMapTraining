import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Build aborted: missing required env var ${key}`)
  }
  return { plugins: [react()] }
})
