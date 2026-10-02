import next from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  ...next,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'supabase/functions/**',
      'src/lib/supabase/database.types.ts',
      'playwright-report/**',
      '.lighthouseci/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
]

export default config
