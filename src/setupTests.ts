// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import JXG from 'jsxgraph';

// jsdom never loads MathJax (GraphRoute waits for it in the app), so JSXGraph logs this on every useMathJax
// label update; the lesson restoration suites alone printed ~85k lines in CI. Other JSXGraph debug output stays.
const MATHJAX_NOT_LOADED = 'MathJax (not yet) loaded';
const jsxGraphDebug = JXG.debug;
JXG.debug = (...args: unknown[]) => {
    if (args.length === 1 && args[0] === MATHJAX_NOT_LOADED) return;
    jsxGraphDebug(...args);
};
