// @ts-check

import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    stylistic.configs['all-flat'],
    stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        braceStyle: '1tbs',
        arrowParens: true,
        semi: true,
    }),
    {
        languageOptions: {
            parser: parserTs,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            'camelcase': 'warn', // make error after refactoring Sentry and User Agent models
            'max-len': ['error', {'code': 120}],
            'space-in-parens': ['error', 'never'],
            'space-infix-ops': ['error', {'int32Hint': false}],
            '@stylistic/array-element-newline': 'off',
            '@stylistic/object-property-newline': 'off',
            '@stylistic/function-call-argument-newline': 'off',
            '@stylistic/function-paren-newline': 'off',
            '@stylistic/lines-around-comment': 'off',
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    'selector': 'enumMember',
                    'format': ['camelCase', 'UPPER_CASE', 'PascalCase'],
                },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            // enabled someday:
            '@typescript-eslint/no-unnecessary-condition': 'off', // some of this could be useful
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            '@typescript-eslint/no-unnecessary-type-parameters': 'off',
        },
    },
);
