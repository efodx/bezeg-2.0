#!/usr/bin/env node
// Lesson bug crawler. Usage:
//   node scripts/lesson-crawl/crawl.cjs --base http://localhost:4399 --out <dir> <chapterId>... [--only <substring>] [--frames-only]
// For every `?example=` link (guided lessons and activities) on each chapter page it walks every frame, runs
// mechanical checks, then after Finish sweeps the inspector controls for ones with no visible effect, measures
// layout at the inspector's width, and screenshots the inspector once per graph route. Writes
// <out>/<chapter>/findings.jsonl (one finding per line), <out>/<chapter>/summary.json and PNGs under <out>/<chapter>/shots.
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const BASE = opt('--base') || 'http://localhost:4399';
const OUT = opt('--out') || 'lesson-crawl-out';
const ONLY = opt('--only');
const SWEEP_LIMIT = Number(opt('--sweep-limit') || 60);
// --frames-only walks the lesson frames and the phone check, without the inspector sweep (about 5 s per example).
const FRAMES_ONLY = (i => i >= 0 && Boolean(args.splice(i, 1)))(args.indexOf('--frames-only'));
const chapters = args;
if (!chapters.length) { console.error('usage: crawl.cjs --base URL --out DIR <chapterId>...'); process.exit(2); }

const SKIP_BUTTON = /odstrani|remove|zamenjaj|ponastavi|razveljavi|ponovi|počisti|shrani|izvozi|uvozi|^svg$|^png$|generiraj|reset|undo|redo|clear|save|export|import|naloži|izbriši|prednastavitev|zapri obliko|strni|odpri|^uredi$|^prikaz$|^predvajaj$|^ustavi$|^play$|^pause$|premor/i;
const MATH_LEAK = /\\\(|\\\)|\\\[|\\\]|\$\$|\\frac|\\cdot|\\mathbf|\\sqrt|\\alpha|\\beta|\\lambda/;
const BAD_TOKEN = /\b(NaN|undefined|null|Infinity|\[object Object\])\b/;
const LOC_KEY = /\b[a-z][a-z0-9]*(?:[._][a-z0-9]+){2,}\b/;  // e.g. lesson.bezier.title or curve_display_label


async function settle(page) {
    try {
        await page.waitForFunction(() => {
            const vis = e => { if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
            const panel = document.querySelector('section.guided-lesson');
            if (vis(document.querySelector('button.guided-lesson-tab')) && !vis(panel && panel.querySelector('.guided-lesson-nav-next'))) return true;
            return /guided-lesson-handoff-visible/.test((panel && panel.getAttribute('class')) || '');
        }, undefined, {polling: 'raf', timeout: 10_000});
        return true;
    } catch { return false; }
}
async function reveal(page) {
    await settle(page);
    const next = page.locator('section.guided-lesson .guided-lesson-nav-next');
    if (!(await next.isVisible().catch(() => false))) {
        const tab = page.locator('button.guided-lesson-tab');
        if (await tab.isVisible().catch(() => false)) { await tab.focus(); await page.keyboard.press('Enter'); await settle(page); }
    }
    return next.isVisible().catch(() => false);
}

// Hash of what the graph area draws (SVG markup + canvas pixels) and of the inspector's text and controls.
async function signatures(page) {
    return page.evaluate(() => {
        const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
        const graph = document.querySelector('section.workspace-graph');
        let g = '';
        if (graph) {
            graph.querySelectorAll('svg').forEach(svg => { g += svg.innerHTML.replace(/\s+/g, ' '); });
            graph.querySelectorAll('canvas').forEach(c => { try { g += c.toDataURL().slice(-2000); } catch { g += 'tainted'; } });
            graph.querySelectorAll('.JXGtext, output').forEach(t => { g += t.textContent; });
        }
        const insp = document.querySelector('#workspace-inspector');
        let i = '';
        if (insp) {
            i += insp.innerText;
            insp.querySelectorAll('input,select,textarea').forEach(c => { i += '|' + (c.type === 'checkbox' || c.type === 'radio' ? c.checked : c.value); });
            i += '|' + insp.querySelectorAll('input,select,button,textarea,[role=slider]').length;
        }
        return {graph: h(g), inspector: h(i), graphEmpty: g.length < 50};
    });
}

// Label a control for reports: aria-label, <label for>, wrapping label, or nearest heading text.
const DESCRIBE = el => {
    const txt = s => (s || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    let name = el.getAttribute('aria-label') || '';
    if (!name && el.getAttribute('aria-labelledby')) name = el.getAttribute('aria-labelledby').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
    if (!name && el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) name = l.textContent; }
    if (!name && el.closest('label')) name = el.closest('label').textContent;
    if (!name && el.tagName === 'BUTTON') name = el.textContent;
    const group = el.closest('.inspector-group, details, fieldset');
    const heading = group ? txt(group.querySelector('h3, summary, legend')?.textContent) : '';
    return {name: txt(name), heading, tag: el.tagName.toLowerCase(), type: el.type || el.getAttribute('role') || ''};
};

async function listControls(page, sectionId) {
    return page.evaluate(({sectionId, describeSrc}) => {
        const describe = eval('(' + describeSrc + ')');
        const root = document.getElementById(`inspector-${sectionId}`);
        if (!root) return [];
        const out = [];
        root.querySelectorAll('input, select, button, [role=slider], textarea').forEach((el, index) => {
            if (!window.__crawl.shown(el)) return;
            el.setAttribute('data-crawl-index', `${sectionId}-${index}`);
            const d = describe(el);
            out.push({...d, key: `${sectionId}-${index}`, disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
                selected: el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-current') === 'true',
                value: el.value ?? null, checked: el.checked ?? null});
        });
        return out;
    }, {sectionId, describeSrc: DESCRIBE.toString()});
}

// Apply a small change to a control; returns an undo function, or null when the control kind is not swept.
async function nudge(page, c) {
    const loc = page.locator(`[data-crawl-index="${c.key}"]`);
    try {
        if (c.type === 'range' || c.type === 'slider') {
            await loc.focus(); for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowRight');
            if ((await loc.inputValue().catch(() => c.value)) === c.value) { for (let k = 0; k < 12; k++) await page.keyboard.press('ArrowLeft'); }
            return async () => { await loc.fill(String(c.value)).catch(() => {}); };
        }
        if (c.type === 'checkbox' || c.type === 'radio') {
            await loc.click({timeout: 2000});
            return async () => { if (c.type === 'checkbox') await loc.click({timeout: 2000}).catch(() => {}); };
        }
        if (c.tag === 'select') {
            const opts = await loc.evaluate(s => [...s.options].filter(o => !o.disabled).map(o => o.value));
            const other = opts.find(v => v !== c.value); if (other === undefined) return null;
            await loc.selectOption(other);
            return async () => { await loc.selectOption(c.value).catch(() => {}); };
        }
        if ((c.type === 'text' || c.type === 'number') && c.value !== null && /^-?\d+([.,]\d+)?$/.test(c.value.trim())) {
            const n = Number(c.value.replace(',', '.'));
            const step = Number.isInteger(n) ? 1 : (Math.abs(n) > 5 ? 1 : 0.5);  // integer fields (counts, multiplicities) reject fractions
            await loc.fill(String(n + step).replace('.', c.value.includes(',') ? ',' : '.'));
            await loc.press('Enter');
            return async () => { await loc.fill(c.value).catch(() => {}); await loc.press('Enter').catch(() => {}); };
        }
        if (c.tag === 'button' && !SKIP_BUTTON.test(c.name) && c.name) {
            const pressedBefore = await loc.getAttribute('aria-pressed');
            await loc.click({timeout: 2000});
            return async () => { if (pressedBefore !== null) await loc.click({timeout: 2000}).catch(() => {}); };
        }
    } catch (e) { return {error: e.message.split('\n')[0]}; }
    return null;
}

// Layout measurements inside the inspector: overflow, clipped text, small targets, overlapping controls, unlabeled controls.
async function measureLayout(page, sectionId) {
    return page.evaluate(({sectionId, describeSrc}) => {
        const describe = eval('(' + describeSrc + ')');
        const root = document.getElementById(`inspector-${sectionId}`);
        const insp = document.getElementById('workspace-inspector');
        if (!root || !insp) return [];
        const ib = insp.getBoundingClientRect();
        const issues = [];
        const vis = e => window.__crawl.shown(e);
        root.querySelectorAll('*').forEach(el => {
            if (!vis(el)) return;
            const b = el.getBoundingClientRect();
            if (b.right > ib.right + 1 || b.left < ib.left - 1) {
                if (!el.closest('[data-crawl-reported]')) { el.setAttribute('data-crawl-reported', ''); issues.push({kind: 'layout-overflow', detail: `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} "${(el.textContent || '').trim().slice(0, 40)}" extends ${Math.round(Math.max(b.right - ib.right, ib.left - b.left))}px past the inspector`}); }
            }
            const cs = getComputedStyle(el);
            if (el.children.length === 0 && el.textContent.trim() && el.clientWidth > 4 && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis')
                issues.push({kind: 'layout-clipped-text', detail: `"${el.textContent.trim().slice(0, 50)}" clipped (${el.scrollWidth}>${el.clientWidth}px)`});
        });
        const controls = [...root.querySelectorAll('input:not([type=hidden]), select, button, [role=slider], textarea')].filter(vis);
        controls.forEach(el => {
            const b = el.getBoundingClientRect(); const d = describe(el);
            if (!d.name && el.type !== 'range') issues.push({kind: 'a11y-unlabeled-control', detail: `${d.tag}[${d.type}] under "${d.heading}" has no accessible name`});
            const isTextLike = ['text', 'number'].includes(el.type) || el.tagName === 'SELECT';
            if (!isTextLike && (b.width < 24 || b.height < 24) && el.type !== 'range' && el.type !== 'checkbox' && el.type !== 'radio')
                issues.push({kind: 'layout-small-target', detail: `${d.tag} "${d.name}" is ${Math.round(b.width)}x${Math.round(b.height)}px`});
        });
        controls.forEach(el => {
            const cover = window.__crawl.coveredBy(el);
            if (cover) issues.push({kind: 'layout-overlap', detail: `"${describe(el).name}" (${describe(el).heading}) is covered at its centre by ${cover}`});
        });
        const scroller = document.getElementById('inspector-content'); if (scroller) scroller.scrollTop = 0;
        return issues;
    }, {sectionId, describeSrc: DESCRIBE.toString()});
}

async function frameTextChecks(page) {
    return page.evaluate(() => {
        const panel = document.querySelector('section.guided-lesson');
        if (!panel) return {text: '', mathErrors: 0, label: ''};
        const clone = panel.cloneNode(true);
        clone.querySelectorAll('mjx-container, mjx-assistive-mml, script, style').forEach(n => n.remove());
        return {text: clone.innerText || clone.textContent, mathErrors: panel.querySelectorAll('mjx-merror, .MathJax_Error, [data-mjx-error]').length,
            label: (panel.querySelector('.guided-lesson-progress')?.innerText || '').replace(/\s+/g, ' ').trim()};
    });
}

async function crawlExample(browser, chapter, href, ctx) {
    const id = new URL(href, BASE).searchParams.get('example');
    const route = new URL(href, BASE).pathname;
    const findings = [];
    const add = (kind, severity, frame, detail, shot) => findings.push({chapter, example: id, route, frame, kind, severity, detail, shot: shot || null});
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    page.setDefaultTimeout(4000);
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
    await page.addInitScript({path: path.join(__dirname, 'page-helpers.js')});
    let frameLabel = 'load';
    const history = [];  // sweep actions so far on this page state, for reproducing errors
    let errorCount = 0;
    const withHistory = msg => history.length ? `${msg} | after sweep actions: ${history.slice(-3).join(' → ')}` : msg;
    page.on('pageerror', e => { errorCount++; add('runtime-error', 'high', frameLabel, withHistory(e.message.slice(0, 160))); });
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Download the React DevTools/.test(m.text())) { errorCount++; add('console-error', 'medium', frameLabel, withHistory(m.text().slice(0, 160))); } });
    const shot = async name => { const f = path.join(ctx.shots, `${id.replace(/[^a-z0-9.-]/gi, '_')}-${name}.png`); await page.screenshot({path: f}).catch(() => {}); return path.relative(ctx.dir, f); };
    let frames = 0;
    try {
        await page.goto(BASE + href, {waitUntil: 'domcontentloaded'});
        const panelVisible = await page.locator('section.guided-lesson').waitFor({timeout: 15_000}).then(() => true, () => false);
        if (!panelVisible) { add('lesson-not-opened', 'high', 'load', 'guided lesson panel never appeared', await shot('load')); return {id, frames, findings}; }
        await page.waitForTimeout(800);
        const seen = new Set();
        for (let guard = 0; guard < 60; guard++) {
            const ok = await reveal(page);
            const t = await frameTextChecks(page);
            frameLabel = t.label || `frame${guard + 1}`;
            if (!ok) { add('navigation-stuck', 'high', frameLabel, 'Next button not reachable (settle timed out or panel hidden)', await shot(`stuck-${guard}`)); break; }
            frames++;
            if (seen.has(t.label) && t.label) add('frame-repeat', 'medium', frameLabel, `progress label "${t.label}" repeated after Next`);
            seen.add(t.label);
            const flag = async (kind, sev, detail) => add(kind, sev, frameLabel, detail, await shot(`f${guard + 1}-${kind}`));
            if (MATH_LEAK.test(t.text)) await flag('math-unrendered', 'high', `raw TeX in panel: "${t.text.match(new RegExp('.{0,40}' + MATH_LEAK.source + '.{0,40}'))?.[0]}"`);
            if (t.mathErrors) await flag('math-error', 'high', `${t.mathErrors} MathJax error node(s)`);
            const bad = t.text.match(BAD_TOKEN); if (bad) await flag('bad-token', 'high', `"${t.text.slice(Math.max(0, bad.index - 40), bad.index + 40).replace(/\s+/g, ' ')}"`);
            const key = t.text.match(LOC_KEY); if (key && !/\.(png|svg|js|html)\b|www\.|https?:/.test(key[0])) await flag('raw-loc-key', 'high', `possible untranslated key "${key[0]}"`);
            const sig = await signatures(page); if (sig.graphEmpty) await flag('graph-empty', 'high', 'graph area draws nothing');
            const offscreen = await page.evaluate(() => {
                const board = Object.values(window.JXG?.boards || {}).find(b => b.container === 'jgbox'); if (!board) return 0;
                const [x0, y1, x1, y0] = board.getBoundingBox();
                return Object.values(board.objects).filter(o => o.elType === 'point' && o.visPropCalc?.visible && o.rendNode?.isConnected && (o.X() < x0 || o.X() > x1 || o.Y() < y0 || o.Y() > y1)).length;
            }).catch(() => 0);
            if (offscreen) await flag('points-offscreen', 'low', `${offscreen} visible point(s) outside the board view`);
            // Visible named points and graph labels whose screen position sits under the expanded lesson panel.
            const covered = await page.evaluate(() => {
                const panel = document.querySelector('section.guided-lesson'); if (!panel) return [];
                const pr = panel.getBoundingClientRect(); if (pr.width < 50) return [];
                const board = Object.values(window.JXG?.boards || {}).find(b => b.container === 'jgbox'); if (!board) return [];
                const inside = (x, y) => x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom;
                const host = board.containerObj.getBoundingClientRect();
                const names = [];
                for (const o of Object.values(board.objects)) {
                    if (!o.visPropCalc?.visible || !o.rendNode?.isConnected) continue;
                    if (o.elType === 'point' && o.coords) {
                        const [, sx, sy] = o.coords.scrCoords;
                        if (inside(host.left + sx, host.top + sy)) names.push(o.name || o.id);
                    } else if (o.elType === 'text' && o.rendNode.getBoundingClientRect) {
                        const r = o.rendNode.getBoundingClientRect();
                        if (r.width && inside(r.left + r.width / 2, r.top + r.height / 2)) names.push(`text "${String(o.plaintext || o.rendNode.textContent || '').trim().slice(0, 25)}"`);
                    }
                }
                return names.filter(Boolean);
            }).catch(() => []);
            if (covered.length) add('panel-covers-graph', 'medium', frameLabel, `lesson panel covers ${covered.length} visible point(s)/label(s): ${covered.slice(0, 6).join(', ')}`);
            // Card text that does not fit the card: a row cut at its right edge, or a formula row set smaller to fit.
            const cardText = await page.evaluate(() => {
                const panel = document.querySelector('section.guided-lesson'); if (!panel) return {cut: [], shrunk: []};
                const cut = [], shrunk = [];
                panel.querySelectorAll('.guided-lesson-notation, .guided-lesson-frame p, .guided-lesson-frame h3, .guided-lesson-title, .guided-lesson-worked-example h4').forEach(e => {
                    const what = `${e.classList[0] || e.tagName.toLowerCase()} "${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
                    if (e.scrollWidth > e.clientWidth + 1) cut.push(`${what} needs ${e.scrollWidth}px, has ${e.clientWidth}px${e.style.fontSize ? ` at ${e.style.fontSize}` : ''}`);
                    else if (e.style.fontSize) shrunk.push(`${what} at ${e.style.fontSize}`);
                });
                return {cut, shrunk};
            }).catch(() => ({cut: [], shrunk: []}));
            if (cardText.cut.length) await flag('card-text-cut', 'medium', cardText.cut.slice(0, 4).join(' | '));
            if (cardText.shrunk.length) add('card-formula-shrunk', 'low', frameLabel, cardText.shrunk.slice(0, 4).join(' | '));
            // One reviewer screenshot per example, from the 4th frame (or the 2nd for short lessons, decided at Finish).
            if (guard === 3 || (guard === 1 && !ctx.midShots[id])) { await page.waitForTimeout(600); ctx.midShots[id] = {frame: frameLabel, shot: await shot('mid')}; }  // let panel fade-in finish
            const next = page.locator('section.guided-lesson .guided-lesson-nav-next');
            const finishing = /Končaj in raziskuj graf|Finish example/.test((await next.getAttribute('aria-label')) || '');
            try { await next.click({timeout: 4000}); } catch (e) { await flag('next-blocked', 'high', `real click on Next failed: ${e.message.split('\n')[0].slice(0, 120)}`); break; }
            await settle(page);
            if (finishing) break;
        }
        frameLabel = 'after-finish';
        if (!(await page.locator('section.guided-lesson').innerText().catch(() => '')).match(/Vodeni primer je končan|Example complete/))
            add('no-completion', 'medium', 'after-finish', 'completion message not shown after Finish');
        // Back walk sanity: one frame back from start is covered by the smoke suite; here only the inspector work.
        const firstForRoute = !ctx.routesSeen.has(route); ctx.routesSeen.add(route);
        const sections = FRAMES_ONLY ? [] : await page.$$eval('.inspector-tabs button[aria-controls]', bs => bs.map(b => b.getAttribute('aria-controls').replace('inspector-', '')));
        for (const sec of sections) {
            const tabBtn = page.locator(`.inspector-tabs button[aria-controls="inspector-${sec}"]`);
            await tabBtn.click().catch(() => {}); await page.waitForTimeout(250);
            if (!firstForRoute) continue;  // sweep and layout once per graph route
            for (const issue of await measureLayout(page, sec)) add(issue.kind, issue.kind === 'layout-overflow' ? 'medium' : 'low', `inspector:${sec}`, issue.detail);
            const insp = path.join(ctx.shots, `inspector-${route.replace(/[^a-z0-9]/gi, '_')}-${sec}.png`);
            await page.locator('#workspace-inspector').screenshot({path: insp}).catch(() => {});
            ctx.inspectorShots.push(path.relative(ctx.dir, insp));
            if (sec === 'save') continue;  // presets/export are shared infrastructure, not lesson controls
            // Open closed disclosures and note which controls only appear inside them.
            const closed = await page.$$eval(`#inspector-${sec} details:not([open]) > summary`, ss => ss.map(s => s.textContent.trim().slice(0, 50)));
            await page.$$eval(`#inspector-${sec} details:not([open])`, ds => ds.forEach(d => { d.open = true; }));
            await page.waitForTimeout(200);
            let controls = (await listControls(page, sec)).slice(0, SWEEP_LIMIT);
            const unclosed = new Set();
            const freshRoute = async () => {  // plain route, same tab, disclosures open, controls re-listed
                history.length = 0;
                await page.goto(BASE + route, {waitUntil: 'domcontentloaded'}); await page.waitForTimeout(1200);
                await page.locator(`.inspector-tabs button[aria-controls="inspector-${sec}"]`).click().catch(() => {});
                await page.$$eval(`#inspector-${sec} details:not([open])`, ds => ds.forEach(d => { d.open = true; })).catch(() => {});
                await page.waitForTimeout(200);
                controls = (await listControls(page, sec)).slice(0, SWEEP_LIMIT);
            };
            for (let ci = 0; ci < controls.length; ci++) {
                const c = controls[ci];
                const errorsBefore = errorCount;
                frameLabel = `sweep:${sec}:"${c.name}" (${c.heading})`;
                history.push(`${c.name || c.type}`);
                if (c.selected && c.tag === 'button') continue;
                if (c.disabled) { add('control-disabled', 'info', `inspector:${sec}`, `"${c.name}" (${c.heading}) is disabled after the lesson`); continue; }
                const before1 = await signatures(page); await page.waitForTimeout(250); const before2 = await signatures(page);
                if (before1.graph !== before2.graph) { add('sweep-skipped', 'info', `inspector:${sec}`, `graph animating; skipped "${c.name}"`); continue; }
                const undo = await nudge(page, c);
                if (undo === null) continue;
                if (undo.error) { add('control-unusable', 'medium', `inspector:${sec}`, `"${c.name}" (${c.heading}): ${undo.error.slice(0, 120)}`); continue; }
                await page.waitForTimeout(350);
                const after = await signatures(page);
                if (after.graph === before2.graph && after.inspector === before2.inspector)
                    add('control-no-effect', 'medium', `inspector:${sec}`, `"${c.name || '(unnamed ' + c.type + ')'}" under "${c.heading}" changed neither the graph nor the inspector${closed.includes(c.heading) ? ' (inside a collapsed section)' : ''}`);
                else if (after.graph === before2.graph) unclosed.add(c.key);
                await undo(); await page.waitForTimeout(200);
                if (errorCount > errorsBefore) await freshRoute();  // an error may leave the board broken; avoid cascades
            }
            if (unclosed.size) add('control-inspector-only', 'info', `inspector:${sec}`, `${unclosed.size} control(s) changed only the inspector (reveal/readout), e.g. ${controls.filter(c => unclosed.has(c.key)).slice(0, 4).map(c => `"${c.name}"`).join(', ')}`);
        }
        // Phone check: reopen the example at 390x844 and look at the first frame.
        await page.setViewportSize({width: 390, height: 844});
        frameLabel = 'phone-first-frame';
        await page.goto(BASE + href, {waitUntil: 'domcontentloaded'});
        await page.locator('section.guided-lesson').waitFor({timeout: 15_000}).catch(() => {});
        await page.waitForTimeout(800); await reveal(page);
        const phone = await page.evaluate(() => {
            const next = document.querySelector('section.guided-lesson .guided-lesson-nav-next')?.getBoundingClientRect();
            return {overflow: document.scrollingElement.scrollWidth - innerWidth, nextInView: !!next && next.bottom <= innerHeight && next.top >= 0 && next.right <= innerWidth};
        });
        if (phone.overflow > 1) add('phone-overflow', 'medium', 'phone-first-frame', `page scrolls horizontally by ${phone.overflow}px at 390px`, await shot('phone'));
        if (!phone.nextInView) add('phone-next-hidden', 'medium', 'phone-first-frame', 'Next button not inside the 390x844 viewport', await shot('phone-next'));
    } catch (e) {
        add('crawler-error', 'info', frameLabel, e.message.split('\n')[0].slice(0, 200), await shot('crawler-error'));
    } finally { await page.close(); }
    return {id, frames, findings};
}

(async () => {
    const browser = await chromium.launch();
    for (const chapter of chapters) {
        const dir = path.join(OUT, chapter); const shots = path.join(dir, 'shots');
        fs.mkdirSync(shots, {recursive: true});
        const page = await browser.newPage();
        await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
        await page.goto(`${BASE}/bezeg-2.0/learn/${chapter}`, {waitUntil: 'networkidle'});
        const hrefs = [...new Set(await page.$$eval('a[href*="example="]', as => as.map(a => a.getAttribute('href'))))].filter(h => !ONLY || h.includes(ONLY));
        await page.close();
        const ctx = {dir, shots, routesSeen: new Set(), inspectorShots: [], midShots: {}};
        const results = [];
        fs.writeFileSync(path.join(dir, 'findings.jsonl'), '');
        for (const href of hrefs) {
            const r = await crawlExample(browser, chapter, href, ctx);
            results.push({id: r.id, frames: r.frames, findings: r.findings.length});
            fs.appendFileSync(path.join(dir, 'findings.jsonl'), r.findings.map(f => JSON.stringify(f)).join('\n') + (r.findings.length ? '\n' : ''));
            console.log(`${r.id}: ${r.frames} frames, ${r.findings.length} findings`);
        }
        const all = fs.readFileSync(path.join(dir, 'findings.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
        const byKind = {}; all.forEach(f => { byKind[f.kind] = (byKind[f.kind] || 0) + 1; });
        fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({chapter, examples: results.length, noLinks: hrefs.length === 0, byKind, results, inspectorShots: ctx.inspectorShots.filter(s => !/-save\.png$/.test(s)), midShots: ctx.midShots}, null, 1));
        console.log(`CHAPTER ${chapter}: ${results.length} examples, ${all.length} findings ${JSON.stringify(byKind)}`);
    }
    await browser.close();
})();
