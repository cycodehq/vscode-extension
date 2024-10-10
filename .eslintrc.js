module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'google',
  ],
  env: {
    node: true,
  },
  rules: {
    'semi': 'off',
    '@typescript-eslint/semi': 'error',
    '@typescript-eslint/member-delimiter-style': 'error',
    '@typescript-eslint/type-annotation-spacing': 'error',
    'func-call-spacing': 'off',
    '@typescript-eslint/func-call-spacing': 'error',
    'no-any': 0,
    'max-len': ['error', {'code': 120}],
    'new-cap': 0,
    'require-jsdoc': 0,
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': ['error', {'int32Hint': false}],
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        'selector': 'enumMember',
        'format': ['camelCase', 'UPPER_CASE', 'PascalCase'],
      },
    ],
    '@typescript-eslint/restrict-plus-operands': 'error',
    // FIXME(MarshalX): refactor code and enable these rules:
    'no-unused-vars': 0,
    'camelcase': 0,
    '@typescript-eslint/no-floating-promises': 0,
    '@typescript-eslint/no-unsafe-assignment': 0,
    '@typescript-eslint/no-unsafe-member-access': 0,
    '@typescript-eslint/no-unsafe-return': 0,
    '@typescript-eslint/no-unsafe-argument': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/restrict-template-expressions': 0,
    '@typescript-eslint/no-unsafe-call': 0,
  },
  ignorePatterns: ['out', 'dist', '**/*.d.ts'],
};
