// Shared helpers for the data-driven guided-lesson smoke spec (tests/guided-lessons.smoke.spec.cjs).
const {test, expect} = require('@playwright/test');

const lessonPanel = page => page.locator('section.guided-lesson');
const nextButton = page => lessonPanel(page).locator('.guided-lesson-nav-next');
const backButton = page => lessonPanel(page).locator('.guided-lesson-nav-back');
const exitButton = page => lessonPanel(page).getByRole('button', {name: /Exit lesson|Končaj učno pot/});
const learnButton = page => page.getByRole('button', {name: 'Learn this demonstration'});
const reopenButton = page => page.locator('button.guided-lesson-tab');
const lessonHeading = page => lessonPanel(page).getByRole('heading', {level: 2});

// Uncaught page errors and console errors fail every test. Call once at file level.
function failOnRuntimeErrors() {
    let runtimeErrors;
    test.beforeEach(({page}) => {
        runtimeErrors = [];
        page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on('console', message => {
            if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`);
        });
    });
    test.afterEach(() => {
        expect(runtimeErrors, 'uncaught page errors / console errors').toEqual([]);
    });
}

async function useLanguage(page, language) {
    await page.addInitScript(value => localStorage.setItem('bezeg-2.0:bezeg-language', value), language);
}

// Counts live JSXGraph objects whose SVG node is attached to the main board.
function boardStats(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('main board missing');
        // JSXGraph adds default axes, ticks, and axis labels to board.objects. Their
        // number depends on the viewport scale, so exclude that board infrastructure
        // from the graph-owned object total used by lesson leak checks.
        const axisInfrastructure = new Set();
        const visitAxisObject = object => {
            if (!object || (typeof object !== 'object' && typeof object !== 'function') || axisInfrastructure.has(object)) return;
            axisInfrastructure.add(object);
            for (const key of ['childElements', 'ticks', 'labels']) {
                const children = object[key];
                if (children && typeof children === 'object') Object.values(children).forEach(visitAxisObject);
            }
            visitAxisObject(object.defaultTicks);
        };
        for (const axis of [board.defaultAxes?.x, board.defaultAxes?.y]) {
            visitAxisObject(axis);
            if (!axis) continue;
            for (const ancestor of Object.values(axis.ancestors || {})) visitAxisObject(ancestor);
            visitAxisObject(axis.point1);
            visitAxisObject(axis.point2);
        }
        const graphOwnedTotal = Object.values(board.objects).filter(object => !axisInfrastructure.has(object)).length;
        const stats = {curves: 0, visibleCurves: 0, drawnCurves: 0, curveIds: [], points: 0, sliders: 0, labels: 0, total: graphOwnedTotal};
        for (const object of Object.values(board.objects)) {
            const connected = Boolean(object.rendNode?.isConnected);
            const visible = object.visPropCalc?.visible !== false;
            if (object.elType === 'curve' && connected) { stats.curves += 1; stats.curveIds.push(object.id); if (visible) stats.visibleCurves += 1; if (visible && (object.points?.length ?? 0) > 2) stats.drawnCurves += 1; }
            if (object.elType === 'point' && visible && connected) stats.points += 1;
            if (object.elType === 'slider') stats.sliders += 1;
            // Weight labels are smart labels rendered as text nodes with this class.
            const cls = String(object.rendNode?.className?.baseVal ?? object.rendNode?.className ?? '');
            if (object.elType === 'text' && connected && visible && cls.includes('smart-label-point2')) stats.labels += 1;
        }
        return stats;
    });
}

// drawnCurves excludes the 2-point zero-length remainder curve the subdivision graphs leave at t = 1.
// Weight labels ("w_{i}=1.50") currently shown on the board, in label order.
function boardWeights(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        const weights = [];
        for (const object of Object.values(board.objects)) {
            if (object.elType !== 'text' || !object.rendNode?.isConnected || object.visPropCalc?.visible === false) continue;
            const match = /w_\{(\d+)\}=(-?\d+(?:\.\d+)?)/.exec(String(object.plaintext ?? ''));
            if (match) weights.push([Number(match[1]), Number(match[2])]);
        }
        return weights.sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
    });
}

// Visible board points as [x, y] pairs rounded to 2 decimals.
function visiblePoints(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        return Object.values(board.objects)
            .filter(object => object.elType === 'point' && object.rendNode?.isConnected && object.visPropCalc?.visible !== false)
            .map(object => [Number(object.X().toFixed(2)), Number(object.Y().toFixed(2))]);
    });
}

// Visible board points outside the board's current bounding box, as "(x, y)" strings. A lesson view must frame
// every visible point at any canvas aspect; an empty list for a missing board would hide a broken scene, so throw.
function offscreenPoints(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === container.id || candidate.containerObj === container);
        if (!board) throw new Error('main board missing');
        const [left, top, right, bottom] = board.getBoundingBox();
        return Object.values(board.objects)
            .filter(object => object.elType === 'point' && object.rendNode?.isConnected && object.visPropCalc?.visible !== false)
            .filter(object => object.X() < left || object.X() > right || object.Y() > top || object.Y() < bottom)
            .map(object => `(${object.X().toFixed(2)}, ${object.Y().toFixed(2)})`);
    });
}

// The inspector's tab buttons are addressed by the section they open, so the lookup works in either language.
// Hidden tab sections stay mounted, so their controls are invisible to getByRole until the tab is pressed.
async function openInspectorTab(page, section) {
    const tab = page.locator(`.inspector-tabs button[aria-controls="inspector-${section}"]`);
    if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
}

// The integer value of the Nth count stepper (CountSetter): an editable field when the graph sets the count directly, else an output.
async function countSetterValue(page, index) {
    const text = await page.locator('.count-setter').nth(index).evaluate(root => {
        const field = root.querySelector('input');
        return field ? field.value : root.querySelector('output')?.textContent ?? '';
    });
    return Number(text.replace(/\D+/g, ''));
}

// Wait until either the expanded instruction panel or its compact graph tab is available.
async function settle(page) {
    await expect.poll(async () => {
        if (await reopenButton(page).isVisible() && !(await nextButton(page).isVisible())) return true;
        return /guided-lesson-handoff-visible/.test((await lessonPanel(page).getAttribute('class')) || '');
    }).toBe(true);
    await page.waitForTimeout(20);
}

// Reopens instructions from the compact graph tab; progression stays inside the expanded overlay.
async function reveal(page) {
    await settle(page);
    if (!(await nextButton(page).isVisible())) {
        await reopenButton(page).focus();
        await page.keyboard.press('Enter');
        await settle(page);
    }
    await expect(nextButton(page)).toBeVisible();
}

async function progress(page) {
    await reveal(page);
    return (await lessonPanel(page).locator('.guided-lesson-progress').innerText()).replace(/\s+/g, ' ').trim();
}

// "Step 3 of 5" / "Korak 3 od 5" -> 3
function stepNumber(label) {
    return Number((label.match(/(\d+)\D+\d+/) || [])[1]);
}

async function isFinishing(page) {
    return /^(Complete lesson|Zaključi učno pot)$/.test((await nextButton(page).getAttribute('aria-label')) || '');
}

async function advance(page) {
    await reveal(page);
    await nextButton(page).click();
    await settle(page);
}

async function back(page) {
    await reveal(page);
    await backButton(page).click();
    await settle(page);
}

async function exitAndConfirm(page) {
    await exitButton(page).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', {name: /Exit and restore graph|Zapusti in povrni graf/}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function advanceToStep(page, step) {
    for (let guard = 0; guard < 40; guard += 1) {
        if (stepNumber(await progress(page)) >= step) return;
        await advance(page);
    }
    throw new Error(`step ${step} not reached`);
}

// Steps forward until the last frame, recording each progress label; clicks Finish.
async function stepToCompletion(page, perFrame) {
    const seen = [];
    for (let guard = 0; guard < 40; guard += 1) {
        const label = await progress(page);
        seen.push(label);
        if (perFrame) await perFrame(label);
        const finishing = await isFinishing(page);
        await nextButton(page).click();
        await settle(page);
        if (finishing) break;
    }
    await expect(lessonPanel(page)).toContainText(/Lesson complete|Učna pot je končana/);
    return seen;
}

async function noHorizontalOverflow(page) {
    const {scrollWidth, innerWidth} = await page.evaluate(() => ({
        scrollWidth: document.scrollingElement.scrollWidth, innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
}

// Every MathJax expression in the lesson text is a tab stop (MJX-CONTAINER, accessibility explorer), so the number of
// stops before Next grows with the amount of notation in the first frame: spline-g1 needs 27 presses, bernstein 15.
async function pressNextWithKeyboard(page) {
    let reached = false;
    for (let presses = 0; presses < 60; presses += 1) {
        await page.keyboard.press('Tab');
        const active = await page.evaluate(() => document.activeElement?.className || '');
        if (String(active).includes('guided-lesson-nav-next')) { reached = true; break; }
    }
    expect(reached, 'Next button focused through Tab').toBe(true);
    await page.keyboard.press('Enter');
}

module.exports = {
    lessonPanel, nextButton, backButton, exitButton, exitAndConfirm, learnButton, reopenButton, lessonHeading,
    failOnRuntimeErrors, useLanguage, boardStats, boardWeights, visiblePoints, offscreenPoints, settle, reveal, progress, stepNumber, isFinishing,
    advance, back, advanceToStep, stepToCompletion, noHorizontalOverflow, pressNextWithKeyboard,
    openInspectorTab, countSetterValue,
};
