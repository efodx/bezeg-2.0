'use strict';

/**
 * In-page check that a patch surface view is actually drawn by the JSXGraph SVG surface view (jsxSurfaceView.ts).
 * It runs inside the browser (Playwright `evaluate` / `waitForFunction` serialize it), so it must stay self-contained.
 *
 * Passes only when the host has `[data-jsx-surface-view]`, whose SVG has a nonzero size and at least one shown
 * `polygon`/`polyline` whose `points` hold finite coordinate pairs. A blank or missing view reports `ok: false`
 * with a `reason`.
 */
function inspectSurfaceViewInPage(host) {
    const result = {ok: false, reason: '', view: null, svg: {width: 0, height: 0}, drawables: 0};
    const view = host && host.querySelector('[data-jsx-surface-view]');
    if (!view) { result.reason = 'no [data-jsx-surface-view] element in the surface host'; return result; }
    result.view = view.getAttribute('data-jsx-surface-view');
    const svg = view.querySelector('svg');
    if (!svg) { result.reason = 'the surface view has no SVG'; return result; }
    const rect = svg.getBoundingClientRect();
    result.svg = {width: Math.round(rect.width), height: Math.round(rect.height)};
    if (!(rect.width > 0 && rect.height > 0)) { result.reason = 'the surface SVG has zero size'; return result; }
    for (const node of svg.querySelectorAll('polygon, polyline')) {
        if (node.getAttribute('display') === 'none') continue;
        const pairs = (node.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean);
        if (pairs.length >= 2 && pairs.every(pair => { const xy = pair.split(','); return xy.length === 2 && xy.every(v => v !== '' && Number.isFinite(Number(v))); })) result.drawables++;
    }
    if (result.drawables === 0) { result.reason = 'the surface SVG has no drawn polygon/polyline with points'; return result; }
    result.ok = true;
    return result;
}

/** Polls the page until the surface view is drawn (see inspectSurfaceViewInPage); throws with the last reason on timeout. */
async function waitForSurfaceViewDrawn(page, {timeout = 20000, selector = '#jgbox'} = {}) {
    const deadline = Date.now() + timeout;
    let last;
    for (;;) {
        last = await page.locator(selector).evaluate(inspectSurfaceViewInPage);
        if (last.ok) return last;
        if (Date.now() >= deadline) throw new Error(`The surface is not drawn by the JSXGraph SVG surface view: ${last.reason}`);
        await page.waitForTimeout(100);
    }
}

module.exports = {inspectSurfaceViewInPage, waitForSurfaceViewDrawn};
