const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');
h.failOnRuntimeErrors();

const chapters = ['foundations', 'bezier-curves', 'rational-curves', 'splines', 'ph-curves', 'parametrization', 'bezier-patches', 'functions-and-calculus', 'analysis'];

const patchSections = [
    ['curve-to-patch', 'Od krivulje do krpe', 'From curve to patch'],
    ['bilinear-patch', 'Bilinearna Bézierjeva krpa', 'The bilinear patch'],
    ['control-net', 'Kontrolna mreža in tenzorska definicija', 'Control net and tensor definition'],
    ['boundary-iso-curves', 'Robne krivulje in izoparametrične krivulje', 'Boundary curves and iso-curves'],
    ['tensor-decasteljau', 'De Casteljau na krpi', 'De Casteljau on a patch'],
    ['properties', 'Lastnosti in nelastnosti', 'Properties and non-properties'],
    ['tensor-derivatives', 'Tangentna ravnina, normala in mešani odvod', 'Tangent plane, normal and twist'],
    ['tensor-subdivision', 'Višanje stopnje in subdivizija', 'Degree elevation and subdivision'],
    ['tensor-joins', 'Spajanje krp', 'Joining patches'],
    ['triangular-patches', 'Trikotne Bézierjeve krpe', 'Triangular patches'],
    ['square-vs-triangular', 'Kvadratna ali trikotna krpa', 'Square versus triangular patch'],
];

test('Learn opens chapters whose Guided examples return to their owning section', async ({page}) => {
    await h.useLanguage(page, 'sl');
    await page.goto('/bezeg-2.0/learn');
    await expect(page.locator('.learning-family')).toHaveCount(chapters.length);
    expect(await page.locator('.learning-family').evaluateAll(families => families.map(family => family.id))).toEqual(chapters);
    await expect(page.locator('.learning-lessons')).toHaveCount(0);
    await expect(page.locator('.app-header-actions a')).toHaveCount(2);
    await page.locator('#bezier-patches .learning-open').click();
    await expect(page).toHaveURL('/bezeg-2.0/learn/bezier-patches');
    await page.getByRole('link', {name: /Vsa učna vsebina/}).click();
    await expect(page).toHaveURL('/bezeg-2.0/learn#bezier-patches');
    await expect(page.locator('#bezier-patches-heading')).toBeInViewport();
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
        if (chapter === 'bezier-patches') {
            expect(await page.locator('.chapter-section').evaluateAll(sections => sections.map(section => section.id)))
                .toEqual(patchSections.map(([id]) => id));
            expect(await page.locator('.chapter-section h2').allTextContents()).toEqual(patchSections.map(([, sl]) => sl));
            for (const [id] of patchSections) {
                await expect(page.locator(`#${id} .chapter-paragraph`).first()).toContainText('Cilj razdelka:');
            }
            await expect(page.locator('.chapter-prerequisites')).toContainText('Bézierjeve krivulje');
            await expect(page.locator('.chapter-prerequisites')).toContainText('/bezeg-2.0/learn/bezier-curves');
            await expect(page.locator('#curve-to-patch .chapter-activity-figure img')).toHaveCount(1);
            const preview = page.locator('#curve-to-patch .chapter-activity-figure');
            await preview.scrollIntoViewIfNeeded();
            await expect.poll(() => preview.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
            await expect(preview.locator('img')).toHaveAttribute('alt', /Tenzorska Bézierjeva krpa/);
            await expect(preview.locator('figcaption')).toContainText('katalogov predogled privzetega prikaza');
        }
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
        if (chapter === 'bezier-patches') {
            expect(await page.locator('.chapter-section h2').allTextContents()).toEqual(patchSections.map(([, , en]) => en));
            for (const [id] of patchSections) {
                await expect(page.locator(`#${id} .chapter-paragraph`).first()).toContainText('Learning outcome:');
            }
            await expect(page.locator('.chapter-prerequisites')).toContainText('Bézier curves:');
            await expect(page.locator('.chapter-prerequisites')).toContainText('/bezeg-2.0/learn/bezier-curves');
            await expect(page.locator('#curve-to-patch .chapter-activity-figure figcaption'))
                .toContainText('catalog preview of the default scene');
            await expect(page.locator('#curve-to-patch .chapter-activity-figure img')).toHaveAttribute('alt', /A tensor-product Bézier patch/);
        }
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
        if (chapter === 'bezier-patches') {
            for (const language of ['en', 'sl']) {
                await page.locator('#bezeg-language').selectOption(language);
                await expect(page.locator('.chapter-section h2').first()).toHaveText(patchSections[0][language === 'sl' ? 1 : 2]);
                await expect(page.locator('mjx-container').first()).toBeVisible();
                await expect(page.locator('mjx-merror, .mjx-merror')).toHaveCount(0);
                const layout = await page.evaluate(() => {
                    const maths = [...document.querySelectorAll('.chapter-formula, .chapter-paragraph mjx-container:not([display="true"])')];
                    return {count: maths.length, pageOverflow: document.documentElement.scrollWidth > innerWidth + 2,
                        uncontained: maths.some(math => {
                            const rect = math.getBoundingClientRect();
                            const overflowX = getComputedStyle(math).overflowX;
                            return rect.left < -2 || rect.right > innerWidth + 2 || (math.scrollWidth > math.clientWidth + 2 && !['auto', 'scroll'].includes(overflowX));
                        })};
                });
                expect(layout.count).toBeGreaterThan(0);
                expect(layout.pageOverflow).toBe(false);
                expect(layout.uncontained).toBe(false);
            }
        }
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
