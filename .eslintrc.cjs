module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/consistent-type-exports': ['error', { fixMixedExportsWithInlineTypeSpecifier: true }],
    
    // General code quality rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'prefer-arrow-callback': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-rename': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-constructor': 'error',
    'no-useless-return': 'error',
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Best practices
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'curly': ['error', 'all'],
    'default-case': 'error',
    'no-empty-function': ['error', { allow: ['constructors'] }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-magic-numbers': ['warn', { 
      ignore: [-1, 0, 1, 2, 100, 200, 400, 401, 403, 404, 422, 429, 500, 502, 503, 504],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
    }],
    'prefer-promise-reject-errors': 'error',
    'require-atomic-updates': 'error',
    
    // Formatting (handled by prettier, but enforce consistency)
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'computed-property-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always',
    }],
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
    
    // Import/export rules
    'import/order': 'off', // Handled by TypeScript
    'sort-imports': ['error', {
      ignoreCase: false,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
    }],
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        // Relax some rules for tests
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'no-magic-numbers': 'off',
      },
    },
    {
      files: ['*.config.ts', '*.config.js', '*.config.cjs'],
      rules: {
        // Config files can be more lenient
        '@typescript-eslint/no-var-requires': 'off',
        'no-magic-numbers': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.d.ts',
    '*.js',
    '*.mjs',
    '*.cjs',
  ],
};