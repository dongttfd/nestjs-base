module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    // 'plugin:prettier/recommended',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true
    }
  },
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',

    /**
     * CUSTOMIZATION
     */
    'import/order': [
      'error',
      {
        'newlines-between': 'never',
        groups: [
          'external',
          'builtin',
          'internal',
          'object',
          'type',
          ['parent', 'sibling', 'index'],
        ],
        'pathGroups': [
          { pattern: '@/common', group: 'internal', position: 'before' },
          { pattern: '@/config', group: 'internal', position: 'before' },
          { pattern: '@/common/**', group: 'internal', position: 'before' },
          { pattern: '@/config/**', group: 'internal', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'before' },
          { pattern: './**', group: 'sibling', position: 'before' },
        ],
        warnOnUnassignedImports: true,
        pathGroupsExcludedImportTypes: ['builtin'],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'new-parens': 1,
    'no-bitwise': 1,
    'no-redeclare': 1,
    'camelcase': 1,
    'eol-last': 1,
    'array-callback-return': 1,
    'no-async-promise-executor': 1,
    'no-await-in-loop': 0,
    'no-compare-neg-zero': 1,
    'no-cond-assign': 1,
    'no-console': 1,
    'no-constant-condition': 1,
    'no-constructor-return': 1,
    'no-control-regex': 1,
    'no-debugger': 1,
    'no-dupe-else-if': 1,
    'no-duplicate-case': 1,
    'no-duplicate-imports': 1,
    'no-empty-character-class': 1,
    'no-empty-pattern': 1,
    'no-ex-assign': 1,
    'no-fallthrough': 1,
    'no-import-assign': 1,
    'no-inner-declarations': 1,
    'no-invalid-regexp': 1,
    'no-irregular-whitespace': 1,
    'no-loss-of-precision': 1,
    'no-multiple-empty-lines': [1, { 'max': 1 }],
    'no-multi-spaces': 1,
    // 'no-promise-executor-return': 1,
    'no-self-assign': 1,
    'no-self-compare': 1,
    'no-sparse-arrays': 1,
    'no-template-curly-in-string': 1,
    'no-this-before-super': 1,
    // 'no-undef': 1,
    'no-unexpected-multiline': 1,
    'no-unmodified-loop-condition': 1,
    'no-unreachable': 1,
    'no-unreachable-loop': 1,
    'no-unsafe-finally': 1,
    'no-unsafe-negation': 1,
    'no-unsafe-optional-chaining': 1,
    // 'no-unused-private-class-members': 1,
    // 'no-unused-vars': 1,
    'no-use-before-define': 1,
    'no-useless-backreference': 1,
    'require-atomic-updates': 1,
    'use-isnan': 1,
    'valid-typeof': 1,
    /* Optional */
    'array-bracket-newline': [
      1,
      'consistent'
    ],
    'array-bracket-spacing': [
      1,
      'never'
    ],
    'object-curly-spacing': [
      1,
      'always',
      {
        'arraysInObjects': true,
        'objectsInObjects': true
      }
    ],
    'comma-spacing': [
      1,
      {
        'before': false,
        'after': true
      }
    ],
    'arrow-parens': [
      1,
      'always',
      {
        'requireForBlockBody': true
      }
    ],
    'spaced-comment': [
      1,
      'always'
    ],
    'no-mixed-spaces-and-tabs': 1,
    'no-trailing-spaces': [
      1
    ],
    'no-whitespace-before-property': 1,
    'space-before-blocks': [
      1,
      'always'
    ],
    'space-before-function-paren': [
      1,
      {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always'
      }
    ],
    'space-infix-ops': 1,
    'key-spacing': [
      1,
      {
        'beforeColon': false
      }
    ],
    'keyword-spacing': [
      1
    ],
    'rest-spread-spacing': [
      1,
      'never'
    ],
    'switch-colon-spacing': 1,
    'template-curly-spacing': [
      1,
      'never'
    ],
    'yield-star-spacing': [
      1,
      'after'
    ],
    'indent': [
      1,
      2,
      {
        'SwitchCase': 1,
        'ignoredNodes': [
          'PropertyDefinition'
        ]
      }
    ],
    'quotes': [
      1,
      'single',
      {
        'allowTemplateLiterals': true
      }
    ],
    'no-extra-semi': 'warn',
    'semi-spacing': 'warn',
    'no-empty': 'warn',
    'no-else-return': 'warn',
    'semi': 'warn',
    'no-multiple-empty-lines': ['error', { 'max': 1 }],
    'newline-before-return': 'error'
  },
};
