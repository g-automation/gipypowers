'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    ignores: ['node_modules/**'],
  },
  {
    // catch (e) {} / catch (_) {} for deliberate silent-fail is this repo's
    // established convention (see hooks/*.js, skills/brainstorming/scripts/server.cjs).
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      'eslint.config.js',
      'hooks/**/*.js',
      'skills/**/*.js',
      'skills/**/*.cjs',
    ],
    ignores: ['skills/brainstorming/scripts/helper.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['skills/brainstorming/scripts/helper.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.commonjs },
    },
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
];
