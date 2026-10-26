const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

const chapter = '/bezeg-2.0/learn/bezier-curves';
const examplePath = '/bezeg-2.0/bezier/decasteljau?example=activity.bezier-curves.parameter.decasteljau&other=kept&note=a~and~b#anchor';
const missingPage = readFileSync(join(process.cwd(), 'build/404.html'), 'utf8');

test('the GitHub Pages 404 redirect preserves a guided example URL and returns to its chapter section', async ({page}) => {
    const pageErrors = [];
    const unexpectedFailures = [];
    const failedRequests = [];
    const expectedDocument404 = [];
    let interceptReadingPage = false;
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
        if (response.status() < 400) return;
        const request = response.request();
        const url = new URL(response.url());
        const expectedPath = url.pathname === '/bezeg-2.0/bezier/decasteljau'
            || (interceptReadingPage && url.pathname === '/bezeg-2.0/learn/bezier-curves');
        if (response.status() === 404 && request.isNavigationRequest() && expectedPath) expectedDocument404.push(url.pathname);
        else unexpectedFailures.push(`${response.status()} ${response.url()}`);
    });
    await h.useLanguage(page, 'en');
    await page.route(/\/bezeg-2\.0\/(?:bezier\/decasteljau|learn\/bezier-curves)(?:\?|$)/, async route => {
        const url = new URL(route.request().url());
        const exampleRequest = url.pathname === '/bezeg-2.0/bezier/decasteljau';
        if (exampleRequest || interceptReadingPage) {
            await route.fulfill({status: 404, contentType: 'text/html', body: missingPage});
        } else await route.continue();
    });

    await page.goto(`${chapter}#parameter`);
    const link = page.locator('#parameter .chapter-guided-lessons a[href*="example=activity."]').first();
    await link.click();
    await expect(page.locator('.guided-lesson')).toBeVisible();
    const historyLength = await page.evaluate(() => history.length);
    // Keep unrelated search values and a hash while exercising the same direct-refresh URL on GitHub Pages.
    await page.evaluate(url => history.replaceState(history.state, '', url), examplePath);
    await page.reload();
    await expect(page).toHaveURL(examplePath);
    await expect(page.locator('.guided-lesson')).toBeVisible();
    await expect(page.locator('.guided-lesson-owner')).toContainText(/parameter/i);
    const restored = await page.evaluate(() => history.state);
    expect(restored === null || typeof restored === 'object').toBe(true);
    expect(restored?.usr ?? {}).not.toHaveProperty('chapterActivity');
    expect(restored?.usr ?? {}).not.toHaveProperty('graphSnapshot');
    expect(restored ?? {}).not.toHaveProperty('graphSnapshot');
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    expect(await page.evaluate(() => sessionStorage.getItem('bezeg-2.0:history-entry-bridge:v1'))).toBeNull();

    interceptReadingPage = true;
    await page.locator('.guided-lesson-owner').getByRole('link', {name: 'Return to chapter', exact: true}).click();
    await expect(page).toHaveURL(`${chapter}#parameter`);
    await expect(page.locator('#parameter-heading')).toBeFocused();
    expect(expectedDocument404).toContain('/bezeg-2.0/bezier/decasteljau');
    expect(unexpectedFailures).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
});
