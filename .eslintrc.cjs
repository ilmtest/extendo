module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:react-hooks/recommended',
    'eslint-config-prettier',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh', 'jest', 'react', 'prettier', 'import', 'simple-import-sort', 'sort-keys-fix', 'sort-destructure-keys'],
  rules: {
    'react/jsx-sort-props': ['warn'],
    'import/prefer-default-export': 'off',
    // https://github.com/lydell/eslint-plugin-simple-import-sort
    'simple-import-sort/imports': [
        'error',
        {
            groups: [
                ['^react$', '^'], // Common packages (not included in mentioned rules below - in 99% external).

                // Relative and side effect imports.
                ['^\\.', '^\\u0000'],

                // .css and .scss imports.
                ['.*s?css'],
            ],
        },
    ],

    // Sort destructured keys in alphabetical order.
    // https://www.npmjs.com/package/eslint-plugin-sort-destructure-keys
    'sort-destructure-keys/sort-destructure-keys': ['warn', { caseSensitive: false }],
    // https://www.npmjs.com/package/eslint-plugin-sort-keys-fix
    'sort-keys-fix/sort-keys-fix': ['warn', 'asc', { natural: true }],
    'import/extensions': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
