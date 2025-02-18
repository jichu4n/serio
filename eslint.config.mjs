import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ['**/*.{js,mjs,cjs,ts}']},
  {ignores: ['dist/']},
  {languageOptions: {globals: globals.node}},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
