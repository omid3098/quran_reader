/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: [
    'eslint:recommended'
  ],
  rules: {}
}

