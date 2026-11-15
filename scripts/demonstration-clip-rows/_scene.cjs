'use strict';
// Opens a Demonstration's poster scene for a row clip: the route without a query, in a fresh context, with the full recipe applied.
// The poster (capture-demonstration-previews.cjs) and the clip both start here, so their first frames come from the same state.
const assert = require('node:assert/strict');
const {applyRecipe, waitForBoardDrawn} = require('../demonstration-preview-recipes.cjs');

/** The browser context every row capture and poster uses (same as openRoute in demonstration-preview-motion.cjs). */
async function newSceneContext(browser) {
    const context = await browser.newContext({viewport: {width: 1440, height: 850}, deviceScaleFactor: 2, locale: 'sl-SI', colorScheme: 'light', reducedMotion: 'reduce', timezoneId: 'Europe/Ljubljana'});
    await context.addInitScript(() => {localStorage.clear(); sessionStorage.clear();});
    return context;
}

/**
 * Navigates to the Demonstration route (no query) and waits for the board. A board scene then gets the recipe applied (actions and the
 * outcome check) and MathJax settled; a surface scene is resized by the driver first, which then applies the recipe itself, because a
 * camera fit depends on the host size.
 */
async function openRecipeScene(page, demonstration, recipe, baseUrl, {surface = false} = {}) {
    await page.goto(`${baseUrl}${demonstration.path.slice('/bezeg-2.0'.length)}`, {waitUntil: 'domcontentloaded'});
    assert.equal(new URL(page.url()).pathname, demonstration.path, `${demonstration.id} did not stay on its exact metadata route`);
    assert.equal(new URL(page.url()).search, '', `${demonstration.id} unexpectedly has query settings`);
    await page.locator('#jgbox').waitFor({state: 'visible'});
    if (surface) {
        await page.waitForFunction(require('../patch-surface-motion.cjs').surfaceRouteReadyInPage);
        return null;
    }
    await waitForBoardDrawn(page, demonstration.id);
    const evidence = await applyRecipe(page, recipe);
    await page.evaluate(async () => {
        if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
        if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise();
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    return evidence;
}

module.exports = {newSceneContext, openRecipeScene};
