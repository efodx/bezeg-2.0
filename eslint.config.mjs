// Correctness lint for app code, tests, and tooling. Violations that predate a rule are
// recorded in eslint-suppressions.json; new code must pass. See `just lint` in docs/commands.md.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const unusedVars = ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none'}];

const sharedControlMessage = 'Use the shared controls in src/inputs/ (NumberInput, Slider, CountSetter, OnOffSwitch, ChoiceSelect) or add a reasoned exemption to controlExemptions in eslint.config.mjs (and a row in the spec\'s Likely exceptions).';

// Files that may use raw controls, each with its reason. Spec: docs/specs/shared-graph-controls.md
// (Likely exceptions). "unmigrated" entries go when their family sweep (task 3) lands.
const controlExemptions = [
    {files: ['src/graphs/base/PresetImportDialog.tsx', 'src/graphs/base/PresetSelector.tsx'], reason: 'host chrome, not a graph control'},
    {files: ['src/graphs/base/AxisSelector.tsx', 'src/graphs/base/PointCoordinateEditor.tsx'], reason: 'unmigrated: curves sweep (task 3)'},
    {
        files: [
            'src/graphs/compgeo/BezierClippingControls.tsx', 'src/graphs/compgeo/EulerLinePanel.tsx', 'src/graphs/compgeo/InscribedAnglePanel.tsx',
            'src/graphs/compgeo/InversionPanel.tsx', 'src/graphs/compgeo/NotablePointsPanel.tsx', 'src/graphs/compgeo/PointInPolygonGraph.tsx',
            'src/graphs/compgeo/PointSetControls.tsx', 'src/graphs/compgeo/SimsonLinePanel.tsx', 'src/graphs/compgeo/TriangulationControls.tsx',
            'src/graphs/compgeo/VoronoiControls.tsx',
        ],
        reason: 'unmigrated: compgeo sweep (task 3)',
    },
    {files: ['src/graphs/patches/TensorPatchPanels.tsx'], reason: 'unmigrated: patches sweep (task 3)'},
    {
        files: [
            'src/graphs/projective/CrossRatioControls.tsx', 'src/graphs/projective/FivePointControls.tsx',
            'src/graphs/projective/PolePolarControls.tsx', 'src/graphs/projective/ThreeViewsControls.tsx',
        ],
        reason: 'unmigrated: projective sweep (task 3)',
    },
    {
        files: ['src/learning/playground/collisions/CollisionPlayground.tsx', 'src/learning/playground/LookUnderneath.tsx'],
        reason: 'unmigrated: learning sweep (task 3)',
    },
];

// Hand-built -/+ button pairs have no syntactic signal, so the rule cannot catch them. These files have one today; they
// stay under the rule for raw inputs and migrate to CountSetter in their family sweep (task 3). Not an exemption.
export const uncaughtSteppers = [
    'src/graphs/functions/FourierSeriesGraph.tsx', 'src/graphs/functions/RungeInterpolationGraph.tsx',
    'src/graphs/functions/TaylorGraph.tsx', 'src/graphs/functions/UniformConvergenceGraph.tsx',
    'src/graphs/base/controls/RationalBezierCurveControls.tsx',
];

const rawControlSyntax = [
    {selector: 'JSXOpeningElement[name.type="JSXIdentifier"][name.name=/^(input|select|textarea)$/]', message: sharedControlMessage},
    {selector: 'JSXOpeningElement[name.type="JSXMemberExpression"][name.object.name="Form"][name.property.name=/^(Control|Range|Select|Check)$/]', message: sharedControlMessage},
    {selector: 'JSXOpeningElement[name.type="JSXIdentifier"][name.name=/^Form(Control|Range|Select|Check)$/]', message: sharedControlMessage},
];

export default tseslint.config(
    {ignores: ['build/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.claude/**', '.command-logs/**']},
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
    {
        // Graph and lesson controls come from src/inputs/; see docs/specs/shared-graph-controls.md.
        files: ['src/graphs/**/*.tsx', 'src/learning/**/*.tsx'],
        ignores: ['**/*.test.tsx'],
        rules: {'no-restricted-syntax': ['error', ...rawControlSyntax]},
    },
    ...controlExemptions.map(({files, reason}) => ({
        name: `control exemption: ${reason}`,
        files,
        rules: {'no-restricted-syntax': 'off'},
    })),
);
