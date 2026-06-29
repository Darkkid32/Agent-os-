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
};
