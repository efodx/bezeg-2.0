// Correctness lint for app code, tests, and tooling. Violations that predate a rule are
// recorded in eslint-suppressions.json; new code must pass. See `just lint` in docs/commands.md.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const unusedVars = ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none'}];

export default tseslint.config(
    {ignores: ['build/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.claude/**', '.command-logs/**', '.repo-graph/**']},
    {linterOptions: {reportUnusedDisableDirectives: 'error'}},
    {
        // Node scripts and Playwright specs; page.evaluate callbacks run in the browser.
        files: ['**/*.cjs'],
        extends: [js.configs.recommended],
        languageOptions: {sourceType: 'commonjs', globals: {...globals.node, ...globals.browser}},
        rules: {eqeqeq: ['error', 'smart'], 'no-unused-vars': unusedVars},
    },
    {
        files: ['src/**/*.{ts,tsx}', 'vite.config.mts'],
        extends: [tseslint.configs.recommended],
        plugins: {'react-hooks': reactHooks},
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'error',
            eqeqeq: ['error', 'smart'],
            '@typescript-eslint/no-unused-vars': unusedVars,
            // Style debt rather than a defect class; tsc strict mode already guards typed code.
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);
