import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // loadEnv reads .env.local files; fall back to process.env for Oryx/Docker builds
  // where env vars reach the container but not the Vite subprocess
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const resolved = {}
  for (const key of required) {
    const val = fileEnv[key] || process.env[key]
    if (!val) throw new Error(`Build aborted: missing required env var ${key}`)
    resolved[key] = val
  }
  return {
    plugins: [react()],
    define: Object.fromEntries(
      Object.entries(resolved).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)])
    ),
  }
})
