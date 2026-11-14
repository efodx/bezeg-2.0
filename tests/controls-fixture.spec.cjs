// Rendered fixture of every shared control (docs/specs/shared-graph-controls.md decision 25; fixtures/controls/).
// Run with `just controls-fixture`; the config starts the Vite dev server on port 4328. Per view and language it checks that no
// label, value or hint is clipped, that each focusable control shows a visible focus indicator under keyboard focus, and
// (coarse pointer, 390x844) that interactive targets are at least 44 CSS px; it saves one screenshot per view and language.
const {test, expect} = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, '..', 'test-results-4328', 'controls-fixture');
const VIEWS = [
    {name: '1440x900', width: 1440, height: 900},
    {name: '1024x768', width: 1024, height: 768},
    {name: '724x900', width: 724, height: 900},
    {name: '390x844', width: 390, height: 844},
    {name: '1440x900-text200', width: 1440, height: 900, text200: true},
];
const LANGUAGES = ['sl', 'en'];
const TARGET = 44;

async function openFixture(page, lang, view) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({width: view.width, height: view.height});
    await page.goto(`/bezeg-2.0/fixtures/controls/?lang=${lang}`);
    if (view.text200) await page.addStyleTag({content: 'html { font-size: 200% !important; }'});
    await expect(page.getByTestId('inspector-edit')).toBeVisible();
    await expect(page.getByTestId('inspector-display')).toBeVisible();
    // The fixture shows its refusals a tick after the first render; wait for the last of them.
    await expect(page.getByTestId('inspector-display').locator('[data-fixture="blocked-status"]')).not.toBeEmpty();
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

/** Runs in the page: text, values and hints of every control must fit their inspector and every clipping ancestor. */
function findClipping() {
    const violations = [];
    let checked = 0;
    const kinds = {label: 0, help: 0, hint: 0, input: 0, select: 0, button: 0};
    const canvas = document.createElement('canvas').getContext('2d');
    const visible = el => {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return false; // .visually-hidden and the like
        return !el.closest('[hidden], .visually-hidden');
    };
    const describe = el => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.textContent || el.value || '').trim().slice(0, 40)}"`;
    const clippers = (el, inspector) => {
        const found = [];
        for (let a = el.parentElement; a; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.overflowX !== 'visible' || s.overflowY !== 'visible') found.push(a);
            if (a === inspector) break;
        }
        return found;
    };
    for (const inspector of document.querySelectorAll('[data-testid^="inspector-"]')) {
        const place = inspector.dataset.testid;
        const box = inspector.getBoundingClientRect();
        const fail = (el, why) => violations.push(`${place}: ${why}: ${describe(el)}`);
        const fits = (el, rect, why) => {
            if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5) fail(el, `${why} leaves the inspector (${Math.round(rect.left - box.left)}..${Math.round(rect.right - box.left)} of ${Math.round(box.width)})`);
            for (const a of clippers(el, inspector)) {
                const r = a.getBoundingClientRect();
                if (rect.left < r.left - 0.5 || rect.right > r.right + 0.5 || rect.top < r.top - 0.5 || rect.bottom > r.bottom + 0.5) fail(el, `${why} is cut by ${describe(a)}`);
            }
        };
        for (const el of inspector.querySelectorAll('*')) {
            if (!visible(el)) continue;
            const tag = el.tagName;
            const rect = el.getBoundingClientRect();
            if (tag === 'INPUT') {
                if (el.type === 'checkbox' || el.type === 'range') { fits(el, rect, 'control'); checked++; kinds.input++; continue; }
                checked++; kinds.input++;
                fits(el, rect, 'field');
                if (el.scrollWidth > el.clientWidth + 1) fail(el, `value is clipped (${el.scrollWidth} > ${el.clientWidth})`);
                continue;
            }
            if (tag === 'SELECT') {
                checked++; kinds.select++;
                fits(el, rect, 'select');
                const style = getComputedStyle(el);
                canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
                const shown = el.selectedOptions[0] ? el.selectedOptions[0].textContent : '';
                const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24; // the dropdown arrow
                // ChoiceSelect repeats a clipped selected text in full under the select; that line is measured as help text below.
                const repeated = el.closest('form')?.querySelector('[data-choice-full]');
                if (canvas.measureText(shown).width > room + 1 && !(repeated && visible(repeated) && repeated.textContent === shown)) fail(el, `selected text is clipped (${Math.round(canvas.measureText(shown).width)} > ${Math.round(room)})`);
                continue;
            }
            const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
            if (!own.length) continue;
            checked++;
            if (tag === 'LABEL' || tag === 'H3' || tag === 'SUMMARY' || el.classList.contains('count-setter-label')) kinds.label++;
            else if (tag === 'BUTTON') kinds.button++;
            else if (el.classList.contains('inspector-help') || el.classList.contains('bool-field-help')) kinds.help++;
            else kinds.hint++;
            const range = document.createRange();
            range.selectNodeContents(el);
            const text = range.getBoundingClientRect();
            fits(el, text, 'text');
            const style = getComputedStyle(el);
            if (style.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) fail(el, `text is clipped horizontally (${el.scrollWidth} > ${el.clientWidth})`);
            if (style.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1) fail(el, `text is clipped vertically (${el.scrollHeight} > ${el.clientHeight})`);
            if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth) fail(el, 'text is truncated with an ellipsis');
        }
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) violations.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${window.innerWidth})`);
    return {violations, checked, kinds};
}

/**
 * Runs in the page: a snapshot of everything that can draw a focus indicator on each control matching the selector, in
 * document order; with `activeOnly` just the focused control, as {at, name, now}, or null when focus is elsewhere.
 */
function snapshotIndicators({selector, activeOnly}) {
    const props = ['outlineStyle', 'outlineWidth', 'outlineColor', 'boxShadow'];
    const read = (el, pseudo) => { const s = getComputedStyle(el, pseudo); return props.map(p => s[p]).join('|'); };
    const of = el => {
        const row = el.closest('.bool-field-row');
        const parts = [read(el), read(el, '::-webkit-slider-thumb'), read(el, '::-webkit-slider-runnable-track'), read(el, '::before'), read(el, '::after')];
        if (row) parts.push(...[...row.children].map(c => read(c)), read(row.querySelector('label'), '::before'));
        return parts.join('||');
    };
    const list = [...document.querySelectorAll(selector)];
    if (!activeOnly) return list.map(of);
    const active = document.activeElement;
    const at = list.indexOf(active);
    if (at < 0) return {at, outside: `${active.tagName.toLowerCase()}.${active.className} "${(active.textContent || '').trim().slice(0, 30)}"`};
    return {at, name: `${active.tagName.toLowerCase()} "${(active.getAttribute('aria-label') || active.textContent || active.id).trim().slice(0, 30)}"`, now: of(active)};
}

const SELECT_CLIP = /selected text is clipped/;

const FOCUSABLE = '[data-testid^="inspector-"] :is(input:not([type="hidden"]), select, button, summary, textarea, [tabindex]):not([disabled]):not([tabindex="-1"])';

for (const lang of LANGUAGES) {
    for (const view of VIEWS) {
        test.describe(`${view.name} ${lang}`, () => {
            test('refusal hints are shown on load', async ({page}) => {
                const errors = await openFixture(page, lang, view);
                expect(errors, 'page errors').toEqual([]);
                const refusal = lang === 'sl' ? 'Vrednost je zavrnjena' : 'Value refused';
                for (const placement of ['edit', 'display']) {
                    const inspector = page.getByTestId(`inspector-${placement}`);
                    await expect(inspector.getByText(refusal)).toHaveCount(2);
                    await expect(inspector.locator('[data-fixture="blocked-status"]')).not.toBeEmpty();
                    await expect(inspector.locator('[data-fixture="count-min"] [data-count-status]')).not.toBeEmpty();
                }
            });

            // Composition, not clipping: a row may fit its box and still read badly (docs/specs/control-choice-and-composition.md, Part B).
            // At normal text a point is one line (name, one equal field per axis, remove button); only large text may wrap it.
            if (!view.text200) test('a point row keeps its fields on one line, equally wide', async ({page}) => {
                await openFixture(page, lang, view);
                const result = await page.evaluate(() => {
                    const problems = [];
                    const rows = [...document.querySelectorAll('.point-list-row')].filter(row => row.getBoundingClientRect().width > 1);
                    for (const row of rows) {
                        const name = row.getAttribute('aria-label');
                        const parts = [...row.querySelectorAll('input, button, .point-list-index')].map(el => el.getBoundingClientRect()).filter(r => r.width > 1);
                        const fields = [...row.querySelectorAll('input')].map(el => el.getBoundingClientRect());
                        const middle = parts.map(r => (r.top + r.bottom) / 2);
                        if (Math.max(...middle) - Math.min(...middle) > 2) problems.push(name + ': parts sit on more than one line');
                        const widths = fields.map(r => r.width);
                        if (Math.max(...widths) - Math.min(...widths) > 1) problems.push(name + ': fields differ in width (' + widths.map(Math.round).join(', ') + ')');
                    }
                    return {rows: rows.length, problems};
                });
                expect(result.rows, 'measured point rows').toBeGreaterThan(4);
                expect(result.problems).toEqual([]);
            });

            test('no label, value or hint is clipped', async ({page}) => {
                await openFixture(page, lang, view);
                const result = await page.evaluate(findClipping);
                // An empty selection must fail: every kind of text and every control family has to have been measured.
                expect(result.checked, 'measured elements').toBeGreaterThan(80);
                for (const [kind, count] of Object.entries(result.kinds)) expect(count, `measured ${kind}`).toBeGreaterThan(0);
                fs.mkdirSync(SHOTS, {recursive: true});
                await page.screenshot({path: path.join(SHOTS, `${view.name}-${lang}.png`), fullPage: true});
                expect(result.violations).toEqual([]);
            });

            // A native select shows its option on one line, so a longer option is clipped at 200% text; ChoiceSelect then
            // repeats the selected text in full under the select ([data-choice-full]).
            test('a clipped select repeats its selected text in full, and none at normal text size', async ({page}) => {
                await openFixture(page, lang, view);
                const result = await page.evaluate(findClipping);
                expect(result.kinds.select, 'measured selects').toBeGreaterThan(0);
                const lines = await page.locator('[data-testid^="inspector-"] [data-choice-full]').count();
                if (!view.text200) expect(lines, 'full-text lines at normal size').toBe(0);
                // The main test fails on any clip left; here every clipped select needs its own visible, unclipped full line.
                const shown = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="inspector-"] select')].map(select => {
                    const line = select.closest('form')?.querySelector('[data-choice-full]');
                    return {selected: select.selectedOptions[0]?.textContent ?? '', line: line ? line.textContent : null, wide: line ? line.scrollWidth > line.clientWidth + 1 : false};
                }));
                for (const entry of shown) if (entry.line !== null) { expect(entry.line).toBe(entry.selected); expect(entry.wide, 'full line clipped').toBe(false); }
                if (view.text200) expect(lines, 'full-text lines at 200% text').toBeGreaterThan(0);
                expect(result.violations.filter(v => SELECT_CLIP.test(v))).toEqual([]);
            });

            test('each focusable control shows a focus indicator under keyboard focus', async ({page}) => {
                await openFixture(page, lang, view);
                const before = await page.evaluate(snapshotIndicators, {selector: FOCUSABLE, activeOnly: false});
                const count = before.length;
                expect(count, 'focusable controls').toBeGreaterThan(30);
                // Start before the first control: a click in the page's corner sets the sequential focus starting point.
                await page.locator('main').click({position: {x: 1, y: 1}});
                const missing = [];
                const visited = new Set();
                for (let i = 0; i < count + 1; i++) {
                    await page.keyboard.press('Tab');
                    const info = await page.evaluate(snapshotIndicators, {selector: FOCUSABLE, activeOnly: true});
                    if (info.outside) break; // past the last control: focus left the page's content
                    visited.add(info.at);
                    if (info.now === before[info.at]) missing.push(`${info.name} (#${info.at}) shows no focus indicator`);
                }
                for (let i = 0; i < count; i++) if (!visited.has(i)) missing.push(`control #${i} was never reached by Tab`);
                expect(missing).toEqual([]);
            });
        });
    }

    test.describe(`coarse pointer 390x844 ${lang}`, () => {
        let context;
        let page;
        test.beforeAll(async ({browser}) => {
            context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, reducedMotion: 'reduce', baseURL: 'http://127.0.0.1:4328'});
            page = await context.newPage();
            await page.goto(`/bezeg-2.0/fixtures/controls/?lang=${lang}`);
            await expect(page.getByTestId('inspector-edit')).toBeVisible();
            await page.evaluate(() => document.fonts.ready);
        });
        test.afterAll(async () => { await context.close(); });

        /** In the page: the clickable region of every interactive control, with its label. */
        const targets = () => {
            const rows = [];
            for (const el of document.querySelectorAll('[data-testid^="inspector-"] :is(input, select, button, summary)')) {
                if (el.disabled || el.closest('[hidden], .visually-hidden')) continue;
                const style = getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                // A boolean field's whole row is the target (the label is its native label); other controls are their own box.
                const box = (el.type === 'checkbox' ? el.closest('.bool-field-row') : el).getBoundingClientRect();
                if (box.width <= 1 && box.height <= 1) continue;
                rows.push({
                    name: `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''} "${(el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 30)}"`,
                    numberField: !!el.closest('.number-input') && !el.closest('.count-setter'),
                    width: box.width, height: box.height,
                    place: el.closest('[data-testid]').dataset.testid,
                });
            }
            return rows;
        };

        test('the context is a coarse pointer', async () => {
            expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
        });

        test('interactive targets are at least 44 CSS px', async () => {
            const rows = (await page.evaluate(targets)).filter(r => !r.numberField);
            expect(rows.length, 'measured targets').toBeGreaterThan(24);
            const small = rows.filter(r => r.height < TARGET - 0.5 || r.width < TARGET - 0.5).map(r => `${r.place} ${r.name}: ${Math.round(r.width)}x${Math.round(r.height)}`);
            expect(small).toEqual([]);
            fs.mkdirSync(SHOTS, {recursive: true});
            await page.screenshot({path: path.join(SHOTS, `390x844-coarse-${lang}.png`), fullPage: true});
        });

        test('number fields (standalone and in the slider) are at least 44 CSS px', async () => {
            const rows = (await page.evaluate(targets)).filter(r => r.numberField);
            expect(rows.length, 'measured number fields').toBeGreaterThan(0);
            expect(rows.filter(r => r.height < TARGET - 0.5).map(r => `${r.place} ${r.name}: ${Math.round(r.height)}`)).toEqual([]);
        });
    });
}
