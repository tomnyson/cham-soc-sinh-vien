'use strict';

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'prettier',
  ],
  plugins: [
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Enforce ES6+ features
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'prefer-destructuring': ['error', {
      array: true,
      object: true,
    }],
    'prefer-template': 'error',
    'no-param-reassign': ['error', { props: false }],

    // Delegate formatting to Prettier (task 1.4)
    'prettier/prettier': 'error',
    // Keep max-len as ESLint rule for cases Prettier can't enforce
    'max-len': ['error', { code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],

    // Async/await preference
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops are not allowed. Use Object.{keys,values,entries}() instead.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are not allowed.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode.',
      },
    ],

    // Import rules
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never',
    }],
    'import/prefer-default-export': 'off',

    // Allow console in Node.js server code
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  overrides: [
    {
      // Backend Node.js files use CommonJS
      files: ['server.js', 'src/**/*.js', 'config/**/*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        'import/no-commonjs': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      // Test files have looser restrictions
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'public/vendor/',
    '*.min.js',
  ],
};
