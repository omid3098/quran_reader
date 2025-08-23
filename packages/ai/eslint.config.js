import tsParser from '@typescript-eslint/parser'
export default [
  {
    files: ['src/**/*.{ts,tsx,js}'],
    languageOptions: { parser: tsParser },
    rules: {}
  }
]
