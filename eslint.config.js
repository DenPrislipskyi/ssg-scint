import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'scripts/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  // Модулі, які навмисно експортують і провайдер, і хук/дані поруч із ним.
  // Fast Refresh тут не застосовний, і це свідоме архітектурне рішення.
  {
    files: [
      'src/app/AppLayout.tsx',
      'src/app/providers/**/*.tsx',
      'src/app/router/routes.tsx',
      'src/pages/**/model/**/*.tsx',
      'src/shared/ui/{Toast,Lightbox,Attachment}.tsx',
      'src/widgets/**/*Columns.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Доменна логіка має лишатися переносною: жодного React у чистих функціях.
  {
    files: ['src/entities/**/lib/**/*.ts', 'src/shared/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'react', message: 'Бізнес-логіка не повинна залежати від React.' }] },
      ],
    },
  },
  // Односторонні залежності між шарами (shared → entities → features → widgets → pages → app).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../../*/../*'], message: 'Імпортуйте через alias @/… замість глибоких ../..' },
          ],
        },
      ],
    },
  },
);
