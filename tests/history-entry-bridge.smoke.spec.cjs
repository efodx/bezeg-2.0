const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');

const chapter = '/bezeg-2.0/learn/bezier-curves';
const activityPath = '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter&other=kept&note=a~and~b#anchor';
const missingPage = readFileSync(join(process.cwd(), 'build/404.html'), 'utf8');

test('the GitHub Pages 404 redirect carries bounded state and restores no-hash reading focus after refresh', async ({page}) => {
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
        const activityRequest = url.pathname === '/bezeg-2.0/bezier/decasteljau';
        if (activityRequest || interceptReadingPage) {
            await route.fulfill({status: 404, contentType: 'text/html', body: missingPage});
        } else await route.continue();
    });

    await page.goto(chapter);
    const chapterIdx = await page.evaluate(() => history.state.idx);
    await page.locator('#activity-curve-parameter').click();
    await expect(page.locator('.chapter-activity-context')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(history.state?.usr?.chapterActivity?.started))).toBe(true);
    // Add unrelated URL values without replacing the router's validated navigation state.
    await page.evaluate(url => history.replaceState(history.state, '', url), activityPath);
    const saved = await page.evaluate(() => history.state);

    await page.reload();
    await expect(page).toHaveURL(activityPath);
    await expect(page.locator('.chapter-activity-context')).toBeVisible();
    await expect(page.locator('.activity-notice')).toContainText('Refreshing restarted');
    const restored = await page.evaluate(() => history.state);
    expect(restored.key).toBe(saved.key);
    expect(restored.idx).toBe(saved.idx);
    expect(restored.usr.chapterActivity).toEqual(saved.usr.chapterActivity);
    expect(restored.usr).not.toHaveProperty('graphSnapshot');
    expect(restored).not.toHaveProperty('graphSnapshot');
    expect(await page.evaluate(() => sessionStorage.getItem('bezeg-2.0:history-entry-bridge:v1'))).toBeNull();

    interceptReadingPage = true;
    await page.getByRole('button', {name: 'Continue reading', exact: true}).click();
    await expect(page).toHaveURL(chapter);
    expect(await page.evaluate(() => history.state.usr.chapterReadingInvocation)).toMatchObject({
        v: 1, activityId: 'curve-parameter', sectionId: 'parameter', readingKey: expect.any(String),
    });
    await expect(page.locator('#activity-curve-parameter')).toBeFocused();
    expect(chapterIdx).toBeLessThan(saved.idx);
    expect(expectedDocument404).toContain('/bezeg-2.0/bezier/decasteljau');
    expect(unexpectedFailures).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
});
