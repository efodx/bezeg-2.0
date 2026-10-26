const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');
h.failOnRuntimeErrors();

const chapter = '/bezeg-2.0/learn/bezier-curves';
const examples = [
    ['shape-control', 'control-points', 'bezier/curve', 'bezier'],
    ['curve-parameter', 'parameter', 'bezier/decasteljau', 'decasteljau'],
    ['repeated-interpolation', 'interpolation', 'bezier/decasteljau', 'decasteljau'],
    ['blending-coefficients', 'bernstein-form', 'bernstein', 'bernstein'],
    ['geometric-bounds', 'geometric-properties', 'bezier/curve', 'bezier'],
    ['transform-shape', 'affine-transformations', 'bezier/affine', 'affine'],
];
const exampleLink = (page, section, id) => page.locator(`#example-bezier-curves-${section}-${id}`);
const panel = page => h.lessonPanel(page);

test('each Bézier chapter example opens the shared guided-example surface with its authored graph', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(chapter);
    await expect(page.locator('.chapter-guided-lessons a[href*="example=activity."]')).toHaveCount(6);
    for (const [id, section, route, demonstrationId] of examples) {
        await page.goto(`${chapter}#${section}`);
        const link = exampleLink(page, section, id);
        await expect(link).toBeVisible();
        await expect(link).toContainText('Guided example');
        await link.click();
        await expect(panel(page)).toBeVisible();
        await expect(panel(page).locator('.guided-lesson-owner')).toContainText(/Bézier curves: shaping a curve with control points ·/);
        await expect(page.locator('.chapter-activity-context')).toHaveCount(0);
        await expect(page.locator('#jgbox')).toBeVisible();
        await expect.poll(async () => (await h.boardStats(page)).curves).toBeGreaterThan(0);
        await expect(page).toHaveURL(new RegExp(`${route}\\?example=activity\\.bezier-curves\\.${section}\\.${demonstrationId}$`));

        if (route === 'bezier/decasteljau') {
            await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.50');
            await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[0, 1.75]]));
        }
        if (id === 'blending-coefficients') expect(await h.countSetterValue(page, 0)).toBe(2);
        if (id === 'shape-control' || id === 'geometric-bounds') {
            expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[-4, -3], [-3, 2], [2, 2], [3, -2]]));
        }
        if (id === 'transform-shape') {
            expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[-3, 2], [0, -2], [1, 2], [3, -2]]));
        }
    }
});

test('a short chapter example returns midway with its reading position and invoking link restored through Back and Forward', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(`${chapter}#parameter`);
    const link = exampleLink(page, 'parameter', 'curve-parameter');
    await link.scrollIntoViewIfNeeded();
    await link.evaluate(element => element.focus({preventScroll: true}));
    const focusId = await link.getAttribute('id');
    const before = await page.evaluate(() => {
        const section = document.getElementById('parameter');
        return section.getBoundingClientRect().top;
    });
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).locator('.guided-lesson-progress')).toContainText('Frame 1 of 2');
    await panel(page).locator('.guided-lesson-nav-next').click();
    await expect(panel(page).locator('.guided-lesson-progress')).toContainText('Frame 2 of 2');
    const returnLink = panel(page).getByRole('link', {name: 'Return to chapter', exact: true});
    await returnLink.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${chapter}#parameter`);
    await expect(page.locator(`#${focusId}`)).toBeFocused();
    await expect.poll(() => page.evaluate(before => {
        const section = document.getElementById('parameter');
        return Math.abs(section.getBoundingClientRect().top - before);
    }, before)).toBeLessThan(32);
    await page.goBack();
    await expect(panel(page)).toBeVisible();
    await page.goForward();
    await expect(page.locator(`[id="${focusId}"]`)).toBeFocused();
});

test('a multi-frame authored example advances and returns to its owning chapter section', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/learn/foundations#why-weights');
    const link = page.locator('#why-weights .chapter-guided-lessons a[href*="example=lesson."]').first();
    await expect(link).toBeVisible();
    const focusId = await link.getAttribute('id');
    await link.click();
    await expect(panel(page)).toBeVisible();
    const progress = panel(page).locator('.guided-lesson-progress');
    const firstFrame = await progress.innerText();
    await expect(progress).toContainText(/Step 1 of [2-9]/);
    await expect(progress).toContainText(/Frame 1 of [2-9]/);
    await panel(page).locator('.guided-lesson-nav-next').click();
    await expect(progress).not.toHaveText(firstFrame);
    await expect(panel(page).getByRole('link', {name: 'Return to chapter', exact: true})).toHaveAttribute('href', '/bezeg-2.0/learn/foundations#why-weights');
    await panel(page).getByRole('link', {name: 'Return to chapter', exact: true}).click();
    await expect(page).toHaveURL('/bezeg-2.0/learn/foundations#why-weights');
    await expect(page.locator(`[id="${focusId}"]`)).toBeFocused();
});

test('a guided example stays keyboard-accessible at narrow width and enlarged text', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await h.useLanguage(page, 'en');
    await page.goto(`${chapter}#parameter`);
    await exampleLink(page, 'parameter', 'curve-parameter').click();
    await expect(panel(page)).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const bounds = await panel(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    for (const action of [panel(page).locator('.guided-lesson-nav-next'), panel(page).locator('.guided-lesson-hide')]) {
        await action.scrollIntoViewIfNeeded();
        await expect(action).toBeInViewport({ratio: 1});
        expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await expect(panel(page).getByRole('link', {name: 'Return to chapter', exact: true})).toBeVisible();
    const next = panel(page).locator('.guided-lesson-nav-next');
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(panel(page).locator('.guided-lesson-progress')).toContainText('Frame 2 of 2');
});

async function editFirstPoint(page, x) {
    const editor = page.locator('.point-coordinate-editor').first();
    if ((await editor.count()) === 0) await page.locator('.workspace-curve-picker button').first().click();
    if ((await editor.getAttribute('open')) === null) await editor.locator('summary').click();
    await editor.locator('input[name="x-0"]').fill(String(x));
    await editor.locator('.point-coordinate-form button[type="submit"]').click();
    await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([[x, -3]]));
}

test('completion keeps the example graph editable and Continue in chapter returns to the owner', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(`${chapter}#control-points`);
    await exampleLink(page, 'control-points', 'shape-control').click();
    await expect(panel(page)).toBeVisible();
    await panel(page).locator('.guided-lesson-nav-next').click();
    await panel(page).locator('.guided-lesson-nav-next').click();
    await expect(page.locator('section.guided-lesson.guided-lesson-complete')).toBeVisible();
    await expect(panel(page).getByRole('button', {name: 'Continue in chapter', exact: true})).toBeVisible();
    await editFirstPoint(page, -5);
    await panel(page).getByRole('button', {name: 'Continue in chapter', exact: true}).click();
    await expect(page).toHaveURL(`${chapter}#control-points`);
    await expect(page.locator('#jgbox')).toHaveCount(0);
});

test('legacy chapter activity and direct lesson links resolve to chapter-owned guided examples; free exploration stays open', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole('link', {name: 'Return to chapter', exact: true})).toHaveAttribute('href', `${chapter}#parameter`);
    await page.goto('/bezeg-2.0/bezier/decasteljau?learn=1');
    await expect(panel(page)).toBeVisible();
    await expect(page.locator('.guided-lesson-owner')).toContainText(/Bézier curves.*repeated interpolation/i);
    await expect(page).toHaveURL(/learn=1&learnChapter=bezier-curves&learnSection=interpolation/);

    await page.goto('/bezeg-2.0/bezier/decasteljau');
    await expect(panel(page)).toHaveCount(0);
    await expect(page.locator('#jgbox')).toBeVisible();
    await expect.poll(async () => (await h.boardStats(page)).curves).toBeGreaterThan(0);

    await page.goto('/bezeg-2.0/spline/c1spline?explore=splines.worked-join.spline-c1');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByText('Splines: joining local curves · A worked join of two parabolas', {exact: true})).toBeVisible();
    expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[0, 0], [0.5, 0], [1.5, 2], [2, 4]]));
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
    await page.locator('.chapter-contents-mobile summary').click();
    await page.locator('.chapter-contents-mobile').getByRole('link', {name: /A parameter selects/}).click();
    await expect(page).toHaveURL(/#parameter$/);
    expect(await page.locator('#jgbox').count()).toBe(0);
});
