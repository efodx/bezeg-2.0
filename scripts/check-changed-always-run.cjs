'use strict';

// Unit test files `just check-changed` always runs, in addition to what Vitest's import-graph selection picks.
// They are the catalog-loop and content-lint files of docs/reviews/verification-throughput/unit-audit.md section 2:
// they loop over a lesson/demonstration/preset registry or read files, so a registration change reaches them through
// a file read or a registry the selection misses. Their tests take about 2 s; the step measured 27 s wall on 2 workers
// (2026-11-08), almost all per-file environment setup. None mounts a real board. Keep the list short;
// add a file only if it follows that rule (commands.test.cjs checks that every path exists and mounts no board).
// PresetCatalog.test.tsx is left out: it mounts every graph, and importing graphFactories already gets it selected.
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

module.exports = {ALWAYS_RUN, alwaysRunFiles};
