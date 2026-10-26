const {test, expect} = require('@playwright/test');
const h = require('./lesson-smoke-helpers.cjs');
h.failOnRuntimeErrors();

const chapter = '/bezeg-2.0/learn/bezier-curves';
const examples = [
    ['bezier-curves.control-points.bezier', 'control-points', '/bezeg-2.0/bezier/curve?example=lesson.bezier-curves.control-points.bezier'],
    ['bezier-curves.parameter.decasteljau-parameter', 'parameter', '/bezeg-2.0/bezier/decasteljau?example=activity.bezier-curves.parameter.decasteljau'],
    ['bezier-curves.interpolation.quartic-interpolation', 'interpolation', '/bezeg-2.0/bezier/decasteljau?example=activity.bezier-curves.interpolation.decasteljau'],
    ['bezier-curves.interpolation.decasteljau', 'interpolation', '/bezeg-2.0/bezier/decasteljau?example=lesson.bezier-curves.interpolation.decasteljau'],
    ['bezier-curves.interpolation.alternative-recursion', 'interpolation', '/bezeg-2.0/bezier/decasteljau2?example=lesson.bezier-curves.interpolation.decasteljau-alternative'],
    ['bezier-curves.bernstein-form.bernstein', 'bernstein-form', '/bezeg-2.0/bernstein?example=lesson.bezier-curves.bernstein-form.bernstein'],
    ['bezier-curves.geometric-properties.convex-hull', 'geometric-properties', '/bezeg-2.0/bezier/curve?example=activity.bezier-curves.geometric-properties.bezier'],
    ['bezier-curves.affine-transformations.affine', 'affine-transformations', '/bezeg-2.0/bezier/affine?example=lesson.bezier-curves.affine-transformations.affine'],
    ['bezier-curves.next-ideas.elevation', 'next-ideas', '/bezeg-2.0/bezier/elevation?example=lesson.bezier-curves.next-ideas.elevation'],
    ['bezier-curves.next-ideas.subdivision', 'next-ideas', '/bezeg-2.0/bezier/subdivision-2?example=lesson.bezier-curves.next-ideas.subdivision'],
    ['bezier-curves.next-ideas.repeated-subdivision', 'next-ideas', '/bezeg-2.0/bezier/subdivision?example=lesson.bezier-curves.next-ideas.repeated-subdivision'],
    ['bezier-curves.next-ideas.extrapolation', 'next-ideas', '/bezeg-2.0/bezier/extrapolation?example=lesson.bezier-curves.next-ideas.extrapolation'],
];
const exampleLink = (page, section, id) => page.locator(`[id="example-bezier-curves-${section}-${id}"]`);
const panel = page => h.lessonPanel(page);
const decasteljauMidpoints = new Map([
    ['bezier-curves.parameter.decasteljau-parameter', [0, 1.75]],
    ['bezier-curves.interpolation.quartic-interpolation', [0, 1.75]],
    ['bezier-curves.interpolation.decasteljau', [0, 1]],
]);

test('each Bézier chapter example opens the shared guided-example surface with its authored graph', async ({page}) => {
    await h.useLanguage(page, 'en');
    await page.goto(chapter);
    await expect(page.locator('.chapter-guided-lessons a[href*="example=activity."]')).toHaveCount(3);
    await expect(page.locator('.chapter-guided-lessons a[href*="?example="]')).toHaveCount(12);
    for (const [id, section, destination] of examples) {
        await page.goto(`${chapter}#${section}`);
        const link = exampleLink(page, section, id);
        await expect(link).toBeVisible();
        await expect(link).toContainText('Guided example');
        await expect(link).toHaveAttribute('href', destination);
        await link.click();
        await expect(panel(page)).toBeVisible();
        await expect(panel(page).locator('.guided-lesson-owner')).toContainText(/Bézier curves: shaping a curve with control points ·/);
        await expect(page.locator('.chapter-activity-context')).toHaveCount(0);
        await expect(page.locator('#jgbox')).toBeVisible();
        await expect.poll(async () => (await h.boardStats(page)).curves).toBeGreaterThan(0);
        await expect(page).toHaveURL(destination);

        if (destination.startsWith('/bezeg-2.0/bezier/decasteljau?')) {
            await expect(page.locator('.decasteljau-animation-heading output')).toHaveText('t = 0.50');
            const midpoint = decasteljauMidpoints.get(id);
            expect(midpoint, `${id} has an authored midpoint check`).toBeDefined();
            await expect.poll(() => h.visiblePoints(page)).toEqual(expect.arrayContaining([midpoint]));
        }
        if (id === 'bezier-curves.bernstein-form.bernstein') {
            expect(await h.countSetterValue(page, 0)).toBe(1);
            expect((await h.boardStats(page)).curves).toBe(2);
        }
        if (id === 'bezier-curves.control-points.bezier') {
            expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[-3, -2], [-3, 2], [3, 2], [3, -2]]));
        }
        if (id === 'bezier-curves.geometric-properties.convex-hull') {
            expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[-4, -3], [-3, 2], [2, 2], [3, -2]]));
        }
        if (id === 'bezier-curves.affine-transformations.affine') {
            expect(await h.visiblePoints(page)).toEqual(expect.arrayContaining([[1, 0], [2, 3], [4, 2], [5, -1]]));
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

test('a Splines chapter prompt does not widen the page with enlarged text', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await h.useLanguage(page, 'en');
    await page.goto('/bezeg-2.0/learn/splines#worked-join');
    await expect(page.locator('#worked-join .chapter-exploration-prompt')).toBeVisible();
    await page.evaluate(async () => {
        document.documentElement.style.fontSize = '200%';
        await document.fonts.ready;
        await window.MathJax?.startup?.promise;
        await window.MathJax?.typesetPromise?.([document.querySelector('.chapter-article')]);
    });
    const dimensions = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
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
