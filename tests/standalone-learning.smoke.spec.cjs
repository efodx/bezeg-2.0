const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');
h.failOnRuntimeErrors();
const chapter = '/bezeg-2.0/learn/bezier-curves';
const rows = [
    ['shape-control', 'bezier/curve', 'control-points'],
    ['curve-parameter', 'bezier/decasteljau', 'parameter'],
    ['repeated-interpolation', 'bezier/decasteljau', 'interpolation'],
    ['blending-coefficients', 'bernstein', 'bernstein-form'],
    ['geometric-bounds', 'bezier/curve', 'geometric-properties'],
    ['transform-shape', 'bezier/affine', 'affine-transformations'],
];
const context = page => page.locator('.chapter-activity-context');

test('chapter exploration opens with its return controls in view and keyboard focus', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await h.useLanguage(page, 'en');
    await page.goto(`${chapter}#parameter`);
    await page.locator('#activity-curve-parameter').click();
    const back = context(page).getByRole('button', {name: 'Continue reading', exact: true});
    await expect(context(page).getByRole('button')).toHaveCount(3);
    await expect(context(page).getByRole('button', {name: 'Return to chapter', exact: true})).toHaveCount(0);
    await expect(back).toBeInViewport({ratio: 1});
    await expect(back).toBeFocused();
    const slider = page.locator('.decasteljau-animation-slider input[type="range"]').first();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toBeFocused();
    await expect(page.locator('.decasteljau-animation-heading output')).not.toHaveText('t = 0.50');
    await page.locator('#bezeg-language').focus();
    await page.locator('#bezeg-language').selectOption('sl');
    await expect(context(page).getByRole('button', {name: 'Nadaljuj z branjem', exact: true})).toBeInViewport({ratio: 1});
    await expect(page.locator('#bezeg-language')).toBeFocused();
    // Return remains a native keyboard action after entry.
    await context(page).getByRole('button', {name: 'Nadaljuj z branjem', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#activity-curve-parameter')).toBeFocused();
    await page.goForward();
    await expect(context(page).getByRole('button', {name: 'Nadaljuj z branjem', exact: true})).toBeFocused();
});

test('activity reading actions remain reachable on narrow screens and enlarged text', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/bezier/decasteljau');
    await expect(page.locator('#jgbox')).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const standaloneWidth = await page.evaluate(() => document.scrollingElement.scrollWidth);
    await page.goto(`${chapter}#parameter`);
    await page.locator('#activity-curve-parameter').click();
    const back = context(page).getByRole('button', {name: 'Continue reading', exact: true});
    await expect(back).toBeInViewport({ratio: 1});
    await expect(back).toBeFocused();
    for (const size of ['100%', '200%']) {
        await page.evaluate(size => { document.documentElement.style.fontSize = size; }, size);
        if (size === '100%') await h.noHorizontalOverflow(page, 'activity at normal text size');
        else {
            // Existing inspector fields overflow by 5px at enlarged text on this route.
            // Activity context must fit and must not worsen the standalone width.
            expect(await page.evaluate(() => document.scrollingElement.scrollWidth)).toBeLessThanOrEqual(standaloneWidth);
            const bounds = await context(page).boundingBox();
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
        }
        for (const name of ['Continue reading', 'Reset example', 'Free exploration']) {
            const action = context(page).getByRole('button', {name, exact: true});
            await action.scrollIntoViewIfNeeded();
            await expect(action).toBeInViewport({ratio: 1});
            expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(44);
        }
    }
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#activity-curve-parameter')).toBeFocused();
});

test('activity actions wrap without squeezing the explanation at intermediate widths', async ({page}) => {
    await page.setViewportSize({width: 800, height: 900});
    await page.goto(`${chapter}#parameter`);
    await page.locator('#activity-curve-parameter').click();
    await expect(context(page).getByRole('button').first()).toBeInViewport({ratio: 1});
    const prompt = await page.locator('.activity-context-prompt').boundingBox();
    expect(prompt.width).toBeGreaterThanOrEqual(300);
    await h.noHorizontalOverflow(page, 'activity at 800px');
});
test.describe.configure({mode: 'parallel'});

for (const [id, route, section] of rows) {
    test(`${id}: authored scene, reading round trip, Forward, reset and fresh refresh`, async ({page}) => {
        await h.useLanguage(page, 'en');
        await page.goto(`${chapter}#${section}`);
        await expect(page.locator('.chapter-section')).toHaveCount(8);
        expect(await page.locator('#jgbox').count()).toBe(0);
        await page.locator(`#activity-${id}`).click();
        await expect(context(page)).toBeVisible();
        await expect.poll(async () => (await h.boardStats(page)).curves).toBeGreaterThan(0);
        const initial = await h.boardStats(page);
        if (route === 'bezier/decasteljau') {
            await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.50');
            await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[0, 1.75]]));
            const slider = page.locator('.decasteljau-animation-slider input[type="range"]').first();
            await slider.fill('0.75');
            await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.75');
            await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[2.38, 0.61]]));
        }
        if (id === 'blending-coefficients') expect(await h.countSetterValue(page, 0)).toBe(2);
        if (id === 'shape-control' || id === 'geometric-bounds') {
            const points = await h.visiblePoints(page);
            expect(points).toEqual(expect.arrayContaining([[-4, -3], [-3, 2], [2, 2], [3, -2]]));
        }
        if (id === 'transform-shape') expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[-3, 2], [0, -2], [1, 2], [3, -2]]));
        await context(page).getByRole('button', {name: 'Continue reading', exact: true}).click();
        await expect(page).toHaveURL(new RegExp(`/learn/bezier-curves#${section}$`));
        await expect(page.locator(`#activity-${id}`)).toBeFocused();
        expect(await page.locator('#jgbox').count()).toBe(0);
        await page.goForward();
        await expect(context(page)).toBeVisible();
        if (route === 'bezier/decasteljau') await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.75');
        await context(page).getByRole('button', {name: 'Reset example'}).click();
        if (route === 'bezier/decasteljau') await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.50');
        expect((await h.boardStats(page)).curves).toBe(initial.curves);
        await page.reload();
        await expect(context(page)).toBeVisible();
        await expect(page.locator('.activity-notice')).toContainText('Refreshing restarted');
        expect(await page.locator('#jgbox').count()).toBe(1);
    });
}

test('validated activity context preserves unrelated URL values and fresh return history', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/bernstein?chapter=bezier-curves&activity=shape-control&other=kept#anchor');
    await expect(page).toHaveURL(/bernstein\?other=kept#anchor$/);
    await expect(page.locator('.activity-notice')).toContainText('valid activity');
    await expect(context(page)).toHaveCount(0);
    await page.goto('/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients&other=kept#anchor');
    await expect(context(page)).toBeVisible();
    await context(page).getByRole('button', {name: 'Free exploration', exact: true}).click();
    await expect(page).toHaveURL(/bernstein\?other=kept#anchor$/);
    expect(await h.countSetterValue(page, 0)).toBe(2);
});

test('unknown chapters offer accessible Learning and Demonstrations recovery; unknown sections return to the chapter start', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/learn');
    await expect(page.getByRole('heading', {level: 2, name: 'Bézier curves', exact: true})).toBeVisible();
    await page.goto('/bezeg-2.0/learn/unknown-chapter');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect(page.locator('main').getByRole('link', {name: 'Learning', exact: true})).toBeVisible();
    await expect(page.locator('#bezeg-language')).toHaveCount(1);
    await page.goto(`${chapter}?other=kept#unknown-section`);
    await expect(page).toHaveURL(/learn\/bezier-curves\?other=kept$/);
    await expect(page.locator('#chapter-title')).toBeFocused();
});

test('reading at 390px and enlarged text retains local formula overflow and direct section access', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(chapter);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    for (const language of ['sl', 'en']) {
        await page.locator('#bezeg-language').selectOption(language);
        await page.evaluate(async () => {
            await window.MathJax?.startup?.promise;
            await window.MathJax?.typesetPromise?.([document.querySelector('.chapter-article')]);
            window.scrollTo(0, 0);
        });
        await h.noHorizontalOverflow(page, `${language} chapter top at 390px and 200% text`);
    }
    await page.getByRole('button', {name: 'Chapter contents', exact: true}).click();
    await page.locator('.chapter-contents-mobile').getByRole('link', {name: /A parameter selects/}).click();
    await expect(page).toHaveURL(/#parameter$/);
    expect(await page.locator('#jgbox').count()).toBe(0);
});

async function editFirstPoint(page, x) {
    const editor = page.locator('.point-coordinate-editor').first();
    if ((await editor.count()) === 0) await page.locator('.workspace-curve-picker button').first().click();
    if ((await editor.getAttribute('open')) === null) await editor.locator('summary').click();
    await editor.locator('input[name="x-0"]').fill(String(x));
    await editor.locator('.point-coordinate-form button[type="submit"]').click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[x, -3]]));
}

test('ordinary scene survives reading and independent activity edits; keyboard editing and language agree with the board', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/bezier/curve');
    await expect.poll(async () => (await h.boardStats(page)).curves).toBeGreaterThan(0);
    await editFirstPoint(page, -5);
    await page.getByRole('button', {name: 'Read about this', exact: true}).click();
    await page.locator('#activity-shape-control').click();
    await editFirstPoint(page, -6);
    await context(page).getByRole('button', {name: 'Continue reading', exact: true}).click();
    await page.getByRole('link', {name: 'Back to your graph'}).click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[-5, -3]]));
    await page.getByRole('button', {name: 'Read about this', exact: true}).click();
    await page.locator('#activity-shape-control').click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[-6, -3]]));
    await page.locator('#bezeg-language').selectOption('sl');
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[-6, -3]]));
    await context(page).getByRole('button', {name: 'Ponastavi primer'}).click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[-4, -3]]));
});

test('activity yields scene ownership to Guided lesson and restores it paused on Exit', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter');
    const slider = page.locator('.decasteljau-animation-slider input[type="range"]').first();
    await slider.fill('0.75');
    await page.getByRole('button', {name: 'Learn this demonstration', exact: true}).click();
    await expect(h.lessonPanel(page)).toBeVisible();
    await h.exitAndConfirm(page);
    await expect(h.lessonPanel(page)).toHaveCount(0);
    await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.75');
    await context(page).getByRole('button', {name: 'Continue reading', exact: true}).click();
    await page.locator('#activity-curve-parameter').click();
    await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.75');
});

test('chapter launch without a hash retains named return and focus after activity refresh', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(chapter);
    await page.locator('#activity-geometric-bounds').click();
    await expect(context(page)).toBeVisible();
    await page.reload();
    await context(page).getByRole('button', {name: 'Continue reading', exact: true}).click();
    await expect(page).toHaveURL(new RegExp('/learn/bezier-curves$'));
    await expect(page.locator('#activity-geometric-bounds')).toBeFocused();
    await page.goForward();
    await expect(context(page)).toBeVisible();
});

test('Bernstein stacked view and affine translation retain their exact authored meanings', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients');
    await h.openInspectorTab(page, 'display');
    const stacked = page.getByLabel('Stacked area chart', {exact: true});
    await stacked.check();
    await expect(stacked).toBeChecked();
    await context(page).getByRole('button', {name: 'Reset example'}).click();
    await expect(stacked).not.toBeChecked();
    await page.goto('/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape');
    await page.getByRole('button', {name: 'Right: +0.5', exact: true}).click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[-2.5, 2], [0.5, -2], [1.5, 2], [3.5, -2]]));
    await context(page).getByRole('button', {name: 'Reset example'}).click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[-3, 2], [0, -2], [1, 2], [3, -2]]));
});
test('chapter return in the demonstration header keeps shared action styling after picker switching', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(`${chapter}#control-points`);
    await page.locator('#activity-shape-control').click();
    await expect(context(page)).toBeVisible();
    await page.getByRole('button', {name: 'Switch demonstration'}).click();
    await page.locator('#demonstration-card-decasteljau-alternative-graph').click();
    await expect(page).toHaveURL(/\/bezier\/decasteljau2$/);

    const returnLink = page.locator('.workspace-actions a[href*="/learn/"]');
    const switchButton = page.getByRole('button', {name: 'Switch demonstration'});
    await expect(returnLink).toHaveCount(1);
    await expect(returnLink).toHaveAttribute('href', '/bezeg-2.0/learn/bezier-curves#control-points');
    expect(await returnLink.evaluate(el => el.tagName)).toBe('A');
    const actionStyle = async element => element.evaluate(el => {
        const s = getComputedStyle(el);
        return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'color', 'borderTopWidth',
            'borderTopStyle', 'borderTopColor', 'borderRadius', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'minHeight', 'textDecorationLine'].map(property => [property, s[property]]));
    });
    expect(await actionStyle(returnLink)).toEqual(await actionStyle(switchButton));
    await returnLink.hover();
    const linkHover = await returnLink.evaluate(el => getComputedStyle(el).backgroundColor);
    await switchButton.hover();
    expect(await switchButton.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(linkHover);

    await page.getByRole('button', {name: 'Presentation mode'}).click();
    await expect(page.locator('.demonstration-workspace.is-presenting')).toBeVisible();
    expect(await actionStyle(returnLink)).toEqual(await actionStyle(switchButton));
    await page.getByRole('button', {name: 'Exit presentation'}).click();

    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const chapterPageWidth = await page.evaluate(() => document.scrollingElement.scrollWidth);
    const headerBounds = await page.locator('.workspace-actions').evaluate(el => {
        const {left, right} = el.getBoundingClientRect();
        return {left, right};
    });
    expect(headerBounds.left).toBeGreaterThanOrEqual(0);
    expect(headerBounds.right).toBeLessThanOrEqual(390);
    expect(await returnLink.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

    await switchButton.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(returnLink).toBeFocused();
    expect(await returnLink.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/learn\/bezier-curves#control-points$/);

    await page.goto('/bezeg-2.0/bezier/decasteljau2');
    await expect(page.locator('.workspace-actions a[href*="/learn/"]')).toHaveCount(0);
    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect.poll(() => page.evaluate(() => document.scrollingElement.scrollWidth)).toBe(chapterPageWidth);
});
