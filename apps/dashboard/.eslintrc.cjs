module.exports = {
  extends: '../../.eslintrc.cjs',
  root: true,
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
  ignorePatterns: ['.next/', 'node_modules/'],
  overrides: [
    {
      // Vitest's `vi.fn(...)` type is too complex for `no-unsafe-call` /
      // `no-unsafe-return` to reason about. Disable just those rules for
      // test files — the test overrides in the root .eslintrc already
      // disable `no-explicit-any` / `no-unsafe-assignment` /
      // `no-unsafe-member-access`, so this is consistent.
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
      },
    },
  ],
};
