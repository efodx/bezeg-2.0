'use strict';

// Unit test files `just check-changed` always runs, in addition to what Vitest's import-graph selection picks.
// They are the catalog-loop and content-lint files of docs/reviews/verification-throughput/unit-audit.md section 2:
// they loop over a lesson/demonstration/preset registry or read files, so a registration change reaches them through
// a file read or a registry the selection misses. Their tests take about 2 s; the step measured 27 s wall on 2 workers
// (2026-11-08), almost all per-file environment setup. None mounts a real board. Keep the list short;
// add a file only if it follows that rule (commands.test.cjs checks that every path exists and mounts no board).
// PresetCatalog.test.tsx is left out: it mounts every graph, and importing allGraphFactories already gets it selected.
const ALWAYS_RUN = [
    'src/demonstrations.test.ts',
    'src/Routes.test.tsx',
    'src/learning/runtime/lessonCatalog.test.ts',
    'src/learning/runtime/lessonSmokeCoverage.test.ts',
    'src/learning/content/familyChapters.test.ts',
    'src/learning/content/guidedExamplePreviewCopy.test.ts',
    'src/learning/content/lessonMathNotation.test.ts',
    'src/learning/content/lessonImportGraph.test.ts',
    'src/learning/chapter/guidedExamplePreviews.test.ts',
    'src/learning/chapter/guidedExampleHighlightCopy.test.ts',
    'src/learning/chapter/authoredChapterCoverage.test.ts',
    'src/learning/chapter/mathAltText.test.ts',
];

// Vitest runs every test when one of these changes (docs/commands.md); then the always-run step adds nothing.
const SELECTS_ALL = /^(package\.json|package-lock\.json|vite\.config\.[cm]?[jt]s|vitest\.config\.[cm]?[jt]s|src\/setupTests\.[jt]s)$/;

// changedFiles: repo-relative paths changed since the ref, or undefined when unknown (then the list is added).
function alwaysRunFiles(changedFiles, list = ALWAYS_RUN) {
    if (changedFiles?.some(file => SELECTS_ALL.test(file))) return [];
    return [...new Set(list)];
}

// Unit tests that read stylesheet source from disk (T02, phase 8 change 1 of docs/specs/verification-throughput.md).
// jsdom applies no stylesheet and Vitest does not process CSS, so no other test can fail on a stylesheet edit. A test
// that reads a .css or .scss file belongs here; commands.test.cjs checks the list against a search of src/.
const STYLESHEET_READERS = [
    'src/graphs/base/controls/OperationApplyReason.test.tsx',
    'src/inputs/ControlRow.test.ts',
    'src/learning/playground/LookUnderneath.test.tsx',
];

const STYLESHEET = /\.(css|scss)$/i;
const NOT_CODE = /^docs\/|\.md$/i;

// True when the change has at least one stylesheet and nothing else but documentation. Unknown changes are not.
function stylesheetOnly(changedFiles) {
    const code = changedFiles?.filter(file => !NOT_CODE.test(file));
    return Boolean(code?.length) && code.every(file => STYLESHEET.test(file));
}

module.exports = {ALWAYS_RUN, STYLESHEET_READERS, alwaysRunFiles, stylesheetOnly};
