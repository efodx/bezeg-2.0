// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import type JXGType from 'jsxgraph';

// Board disposal and memory between tests (docs/commands.md, "Test memory"). Each test file runs in its own worker
// process, so what a file retains is its whole cost: measured 2026-11-01, the lesson restoration files reached 1.9-2.3
// GB with every board freed, because each JSXGraph text update leaves a zero-delay timer that `freeBoard` cannot cancel
// and whose closure holds the board, and a file of synchronous tests never lets those timers fire. Yielding after each
// board-using test and collecting once the heap is large took the heaviest file from 1883 MB to 717 MB at equal time.
// This hook is registered first, so with Vitest's default `stack` order it runs after Testing Library's unmount.
type JXG = typeof JXGType;
type Board = Parameters<JXG['JSXGraph']['freeBoard']>[0];
/** About 1.5 times a jsdom worker's heap after loading the app; below it a forced collection would only cost time. */
const COLLECT_ABOVE_HEAP_BYTES = 384 * 2 ** 20;
// Taken before any test can fake or spy on it: a test that spies on a faked setTimeout and then restores its mocks
// leaves the fake installed as the global.
const realSetTimeout = globalThis.setTimeout;
let createdBoard = false;
// jsdom never loads MathJax (GraphRoute waits for it in the app), so JSXGraph logs this on every useMathJax
// label update; the lesson restoration suites alone printed ~85k lines in CI. Other JSXGraph debug output stays.
const MATHJAX_NOT_LOADED = 'MathJax (not yet) loaded';
const patched = new WeakSet<object>();
/**
 * The setup no longer imports `jsxgraph` itself: ~half the files never load it, and the import cost them tens of ms
 * each. JSXGraph publishes itself as `window.JXG` when a module imports it, so the patch (board tracking and the
 * MathJax log filter) is applied from the hooks below to whichever copy a file loaded, before any test runs.
 */
function loadedJxg(): JXG | undefined {
    const jxg = (globalThis as {JXG?: JXG}).JXG;
    if (!jxg?.JSXGraph) return undefined;
    if (patched.has(jxg)) return jxg;
    patched.add(jxg);
    const jsxGraphDebug = jxg.debug;
    jxg.debug = (...args: unknown[]) => {
        if (args.length === 1 && args[0] === MATHJAX_NOT_LOADED) return;
        jsxGraphDebug(...args);
    };
    const initBoard = jxg.JSXGraph.initBoard;
    jxg.JSXGraph.initBoard = function (this: unknown, ...args: Parameters<typeof initBoard>) {
        createdBoard = true;
        return initBoard.apply(this, args);
    } as typeof initBoard;
    return jxg;
}
const boardsOf = (jxg: JXG | undefined) => (jxg as unknown as {boards: Record<string, Board>} | undefined)?.boards ?? {};
let registeredBefore = new Set<string>();
beforeEach(() => {
    createdBoard = false;
    registeredBefore = new Set(Object.keys(boardsOf(loadedJxg())));
});
afterEach(async () => {
    // JSXGraph may first load inside the test (a dynamic import): patch it now and treat its boards as created here.
    const jxg = loadedJxg();
    const boards = boardsOf(jxg);
    // A board this test created and nobody freed (a view the test never disposed): free it, so it cannot pile up.
    for (const id of Object.keys(boards)) {
        if (registeredBefore.has(id)) continue;
        createdBoard = true;
        try { jxg!.JSXGraph.freeBoard(boards[id]); }
        catch { /* a half-built board must not fail the next test */ }
    }
    // Let JSXGraph's leftover timers fire and drop the disposed boards (under fake timers they stay queued).
    if (createdBoard) await new Promise(resolve => realSetTimeout(resolve, 5));
    // vite.config.mts starts workers with --expose-gc.
    if (process.memoryUsage().heapUsed > COLLECT_ABOVE_HEAP_BYTES) (globalThis as {gc?: () => void}).gc?.();
});
