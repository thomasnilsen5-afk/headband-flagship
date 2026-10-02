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
      'coverage/**',
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
  {
    // three.js objects are mutable by design: R3F mutates materials and meshes inside
    // useFrame, outside React's render phase. The compiler's immutability rule can't see that.
    files: ['src/gl/**'],
    rules: { 'react-hooks/immutability': 'off' },
  },
]

export default config
