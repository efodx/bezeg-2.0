const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');
h.failOnRuntimeErrors();

const chapters = ['foundations', 'bezier-curves', 'rational-curves', 'splines', 'ph-curves', 'parametrization', 'functions-and-calculus', 'analysis'];

test('Learn opens chapters whose Guided examples return to their owning section', async ({page}) => {
    await h.useLanguage(page, 'sl');
    await page.goto('/bezeg-2.0/learn');
    await expect(page.locator('.learning-family')).toHaveCount(8);
    await expect(page.locator('.learning-lessons')).toHaveCount(0);
    await expect(page.locator('.app-header-actions a')).toHaveCount(2);
    await page.locator('#analysis .learning-open').click();
    await expect(page).toHaveURL(/\/learn\/analysis$/);
    await page.getByRole('link', {name: /Vsa učna vsebina/}).click();
    await expect(page).toHaveURL(/\/learn#analysis$/);
    await expect(page.locator('#analysis-heading')).toBeInViewport();
    await page.locator('#bezier-curves .learning-open').click();
    await expect(page).toHaveURL(/\/learn\/bezier-curves$/);
    const link = page.locator('#control-points .chapter-guided-lessons a[href*="example=lesson.bezier-curves.control-points.bezier"]');
    const linkId = await link.getAttribute('id');
    await expect(link).toContainText('Vodeni primer');
    await link.click();
    await expect(page).toHaveURL(/example=lesson\.bezier-curves\.control-points\.bezier/);
    await expect(page.locator('#jgbox')).toBeVisible();
    await expect(page.locator('.guided-lesson')).toBeVisible();
    await expect(page.locator('.chapter-activity-context')).toHaveCount(0);
    const readingReturn = page.locator('.guided-lesson-owner a[href="/bezeg-2.0/learn/bezier-curves#control-points"]');
    await expect(readingReturn).toBeVisible();
    await readingReturn.click();
    await expect(page).toHaveURL('/bezeg-2.0/learn/bezier-curves#control-points');
    await expect(page.locator(`[id="${linkId}"]`)).toBeFocused();
    await expect(page.locator('.chapter-section')).not.toHaveCount(0);
});

test('Demonstrations catalog guidance opens the chapter-owned example while graph entry remains free exploration', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/demonstrations');
    await page.locator('#demonstration-card-decasteljau-lesson').click();
    await expect(page).toHaveURL(/\/bezier\/decasteljau\?learn=1&learnChapter=bezier-curves&learnSection=interpolation/);
    await expect(page.locator('.guided-lesson')).toBeVisible();
    await expect(page.locator('.guided-lesson-owner')).toContainText('Bézier curves');
    await expect(page.locator('.guided-lesson-owner a')).toHaveAttribute('href', '/bezeg-2.0/learn/bezier-curves#interpolation');

    await page.goto('/bezeg-2.0/bezier/decasteljau');
    await expect(page.locator('.guided-lesson')).toHaveCount(0);
    await expect(page.locator('#jgbox')).toBeVisible();
    await expect.poll(async () => (await h.boardStats(page)).curves).toBeGreaterThan(0);
});

for (const chapter of chapters) {
    test(`${chapter}: production deep link, refresh, contents and translated reading`, async ({page}) => {
        await h.useLanguage(page, 'sl');
        await page.goto(`/bezeg-2.0/learn/${chapter}`);
        const heading = await page.locator('h1').textContent();
        expect(heading.trim().length).toBeGreaterThan(5);
        expect(await page.locator('.chapter-section').count()).toBeGreaterThanOrEqual(5);
        await expect(page.locator('#jgbox')).toHaveCount(0);
        await expect(page.locator('mjx-container').first()).toBeVisible();
        await expect(page.locator('mjx-merror, .mjx-merror')).toHaveCount(0);
        const firstSection = await page.locator('.chapter-section').first().getAttribute('id');
        await page.locator(`.chapter-sidebar a[href="#${firstSection}"]`).click();
        await expect(page).toHaveURL(new RegExp(`#${firstSection}$`));
        await page.reload();
        await expect(page.locator(`#${firstSection}`)).toBeInViewport();
        await page.locator('#bezeg-language').selectOption('en');
        await expect(page.locator('h1')).not.toHaveText(heading);
        await expect(page.locator('mjx-container').first()).toBeVisible();
        await expect(page.locator('mjx-merror, .mjx-merror')).toHaveCount(0);
        await page.setViewportSize({width: 390, height: 844});
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        if (chapter === 'parametrization') {
            // Stress the real action labels independent of the host's installed fonts.
            await page.locator('.chapter-open-activity').evaluateAll(actions => {
                if (actions.length === 0) throw new Error('Parametrization chapter action links are missing.');
                actions.forEach(action => { action.style.letterSpacing = '.12em'; });
            });
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        expect(overflow).toBe(false);
        if (chapter === 'parametrization') {
            await expect(page.locator('.chapter-open-activity').first().locator('span[aria-hidden="true"]')).toBeVisible();
        }
        if (chapter !== 'bezier-curves') {
            const summary = page.locator('.learning-mobile-contents summary');
            await summary.focus();
            await page.keyboard.press('Enter');
            await expect(page.locator('.learning-mobile-contents')).toHaveAttribute('open', '');
            await page.locator(`.learning-mobile-contents a[href="#${firstSection}"]`).click();
            await expect(page.locator(`#${firstSection}-heading`)).toBeFocused();
        }
    });
}
