import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // New React Compiler rules (react-hooks v7) are too strict for established
      // patterns in this codebase (setState in effects, ref reads in render for
      // tooltip positioning). Downgrade to warn so they surface without blocking CI.
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      // bodymap.jsx and PageShell.jsx intentionally mix utility exports with
      // components — splitting them would contradict the architecture in CLAUDE.md.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Azure Functions and Vite config run in Node.js, not the browser.
    files: ['api/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
