import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'dev-dist/**', 'coverage/**', 'node_modules/**', '.wrangler/**', 'design/**', 'playwright-report/**', 'test-results/**', '*.d.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, ...pluginVue.configs['flat/recommended']],
    files: ['**/*.{ts,vue,js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      // Formatting is not linted; keep only correctness and Vue best-practice rules.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['*.config.{ts,js}', 'scripts/**', 'tests/e2e/**'],
    languageOptions: { globals: { ...globals.node } },
  },
)
