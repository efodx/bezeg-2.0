const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');
h.failOnRuntimeErrors();

const chapters = ['foundations', 'bezier-curves', 'rational-curves', 'splines', 'ph-curves', 'parametrization', 'functions-and-calculus', 'analysis'];

test('Learn opens chapters whose guided activities return to their section', async ({page}) => {
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
    await page.locator('#foundations .learning-open').click();
    await page.locator('.chapter-guided-lessons a').first().click();
    await expect(page).toHaveURL(/learn=1/);
    await expect(page.locator('#jgbox')).toBeVisible();
    await expect(page.locator('.guided-lesson')).toBeVisible();
    const readingReturn = page.locator('.guided-lesson a[href*="/learn/foundations#"]');
    await expect(readingReturn).toBeVisible();
    const returnHref = await readingReturn.getAttribute('href');
    await readingReturn.click();
    await expect(page).toHaveURL(new RegExp(`${returnHref}$`));
    await expect(page.locator('.chapter-section')).not.toHaveCount(0);
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
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        expect(overflow).toBe(false);
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
