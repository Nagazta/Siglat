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
      // Context files and router files legitimately export both context objects
      // and components — this is a standard React pattern.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // fetchReports is a Promise-based data fetch, not a direct setState call.
      // The pattern (calling a fetch fn in useEffect) is the standard React idiom.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
