import tsParser from '@typescript-eslint/parser'
export default [
  {
    files: ['**/*.{ts,tsx,js}'],
    ignores: ['node_modules/**', '.next/**'],
    languageOptions: { parser: tsParser },
    rules: {}
  }
]
