// Sweeps the inspector of every Demonstration route as images and as layout findings
// (docs/specs/control-choice-and-composition.md, Part B). It needs a running dev or preview server.
//
//   node scripts/controls-sweep/sweep.cjs [--port 4324] [--out .command-logs/controls-sweep] [--routes <regex>]
//                                         [--views desktop,phone,present] [--workers 4]
//
// Per route, view and inspector tab it opens every disclosure, lets the inspector grow to its full height, runs the detectors
// below and crops every block of controls. Blocks are grouped by their DOM structure (tags and classes, no text), so a reviewer
// sees each distinct composition once: <out>/<view>/sheet-NN.png are contact sheets of one example per composition (the
// tallest seen), <out>/findings.json has every detector hit, <out>/summary.md ranks them by the number of routes.
const fs = require('fs');
const path = require('path');
const {chromium} = require('@playwright/test');
const catalog = require('../../tests/smoke-catalog.cjs');

const option = (name, fallback) => {
    const at = process.argv.indexOf(`--${name}`);
    return at < 0 ? fallback : process.argv[at + 1];
};
const PORT = option('port', '4324');
const OUT = path.resolve(option('out', '.command-logs/controls-sweep'));
const ROUTES = new RegExp(option('routes', '.'));
const VIEWS = option('views', 'desktop,phone,present').split(',');
const WORKERS = Number(option('workers', '4'));
const VIEWPORTS = {desktop: {width: 1440, height: 900}, present: {width: 1440, height: 900}, phone: {width: 360, height: 640}};

/** Runs in the page: detector hits and the blocks of the open inspector tab. */
function inspect() {
    const root = document.querySelector('#inspector-content') ?? document.querySelector('#workspace-inspector');
    const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const name = el => (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
    const hits = [];
    const hit = (detector, el, detail) => hits.push({detector, what: name(el), detail});
    const lines = boxes => { const tops = []; for (const b of boxes) { const mid = (b.top + b.bottom) / 2; if (!tops.some(t => Math.abs(t - mid) <= Math.max(4, b.height / 2))) tops.push(mid); } return tops.length; };

    // A point row whose parts sit on more than one line, or whose fields differ in width.
    for (const row of root.querySelectorAll('.point-list-row')) {
        if (!visible(row)) continue;
        const parts = [...row.querySelectorAll('input, button, .point-list-index')].filter(visible).map(el => el.getBoundingClientRect());
        if (lines(parts) > 1) hit('row-wraps', row, 'point row on more than one line');
        const widths = [...row.querySelectorAll('input')].map(el => el.getBoundingClientRect().width);
        if (widths.length > 1 && Math.max(...widths) - Math.min(...widths) > 1) hit('ragged-fields', row, widths.map(Math.round).join(', '));
    }
    // Typed number fields that follow each other and are named as coordinates: a point shown as separate fields.
    const fields = [...root.querySelectorAll('.number-input')].filter(el => visible(el) && !el.closest('.point-list, .slider, .value-list, .count-setter, .point-collection'));
    const label = el => (el.querySelector('label')?.textContent ?? '').trim();
    for (let i = 0; i + 1 < fields.length; i++) {
        const a = label(fields[i]); const b = label(fields[i + 1]);
        if (/(^|[\s:,(_])x\)?$/i.test(a) && /(^|[\s:,(_])y\)?$/i.test(b) && a.slice(0, -1) === b.slice(0, -1)) hit('point-as-fields', fields[i], `${a} / ${b}`);
    }
    // A typed number field that states a range: the catalogue's slider case.
    for (const field of fields) {
        const input = field.querySelector('input');
        if (input?.hasAttribute('aria-valuemin') && input.hasAttribute('aria-valuemax')) hit('ranged-field', field, `${label(field)}: ${input.getAttribute('aria-valuemin')}..${input.getAttribute('aria-valuemax')}`);
    }
    // Fields that stand alone on their line inside one group but do not share their edges.
    for (const group of root.querySelectorAll('.inspector-group, fieldset, details')) {
        const own = [...group.querySelectorAll('input[type="text"], select')].filter(el => visible(el) && el.closest('.inspector-group, fieldset, details') === group && !el.closest('.point-list-row, .slider, .count-setter'));
        const alone = own.map(el => el.getBoundingClientRect()).filter((r, _, all) => all.filter(o => Math.abs((o.top + o.bottom) / 2 - (r.top + r.bottom) / 2) < 4).length === 1);
        if (alone.length > 1) {
            const rights = alone.map(r => Math.round(r.right)); const lefts = alone.map(r => Math.round(r.left));
            if (Math.max(...rights) - Math.min(...rights) > 1 || Math.max(...lefts) - Math.min(...lefts) > 1) hit('ragged-fields', group, `left ${[...new Set(lefts)].join('/')}, right ${[...new Set(rights)].join('/')}`);
        }
    }
    for (const el of root.querySelectorAll('*')) {
        if (!visible(el)) continue;
        const s = getComputedStyle(el);
        // A box drawn on three sides: an edge was removed by another rule.
        const sides = ['Top', 'Right', 'Bottom', 'Left'].map(side => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none');
        if (sides.filter(Boolean).length === 3 && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && el.tagName !== 'INPUT') hit('open-box', el, `missing ${['top', 'right', 'bottom', 'left'][sides.indexOf(false)]} edge`);
        // Help text of more than two lines under a control.
        if (el.matches('.number-input-help, .inspector-help, .slider-help, .choice-select-help, .bool-field-help, .inspector-group > p') && !el.querySelector('p')) {
            const count = Math.round(el.getBoundingClientRect().height / parseFloat(s.lineHeight));
            if (count > 2) hit('long-help', el, `${count} lines`);
        }
        // A disclosure with the browser's own marker instead of the shared chevron.
        if (el.tagName === 'SUMMARY' && s.display === 'list-item' && s.listStyleType !== 'none') hit('native-marker', el, s.listStyleType);
        // A group of buttons that breaks into lines of unequal length.
        if ((el.getAttribute('role') === 'group' || /(^|\s)(control-row|btn-group|[a-z-]*-actions|[a-z-]*-buttons)(\s|$)/.test(el.className)) && !el.matches('.inspector-tabs')) {
            const buttons = [...el.children].filter(child => child.tagName === 'BUTTON' && visible(child)).map(child => child.getBoundingClientRect());
            if (buttons.length > 1 && lines(buttons) > 1 && buttons.length % lines(buttons) !== 0) hit('ragged-buttons', el, `${buttons.length} buttons on ${lines(buttons)} lines`);
        }
        // Text or a control cut by its own box.
        if ((el.tagName === 'INPUT' && el.type === 'text' && el.scrollWidth > el.clientWidth + 1) || (/^(BUTTON|LABEL|P|SPAN|LEGEND|SUMMARY)$/.test(el.tagName) && s.overflow !== 'visible' && el.scrollWidth > el.clientWidth + 1)) hit('clipped', el, `${el.scrollWidth} > ${el.clientWidth}`);
    }
    // The same sentence shown twice in one tab.
    const seen = new Map();
    for (const el of root.querySelectorAll('p, li, dd, legend, h3, label')) {
        if (!visible(el) || el.children.length > 0) continue;
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        if (text.length < 14) continue;
        if (seen.has(text) && seen.get(text) !== el) hit('said-twice', el, text.slice(0, 80)); else seen.set(text, el);
    }
    // A label that touches the control above it.
    const labelled = [...root.querySelectorAll('label, legend')].filter(el => visible(el) && !el.closest('.bool-field, .point-list-row, .checkbox-group'));
    for (const el of labelled) {
        const box = el.getBoundingClientRect();
        const above = [...root.querySelectorAll('select, input[type="text"]')].filter(visible).map(o => o.getBoundingClientRect()).filter(o => o.bottom <= box.top + 1 && box.top - o.bottom < 4 && o.left < box.right && o.right > box.left);
        if (above.length) hit('no-gap', el, `${Math.round(box.top - above[0].bottom)} px below the control above`);
    }

    // Blocks: the children of each inspector group, or the group itself when it is one control.
    const signature = (el, depth = 0) => {
        if (depth > 4) return '';
        const kids = [...el.children].filter(visible).map(child => signature(child, depth + 1));
        const collapsed = kids.filter((kid, at) => kid !== kids[at - 1]);
        const classes = [...el.classList].filter(c => !/^(is-|has-|active|open|selected)/.test(c) && !/\d/.test(c)).sort().join('.');
        return `${el.tagName.toLowerCase()}${classes ? '.' + classes : ''}${collapsed.length ? `(${collapsed.join(',')})` : ''}`;
    };
    const blocks = [];
    const groups = [...root.querySelectorAll('.inspector-group')].filter(el => visible(el) && !el.parentElement.closest('.inspector-group'));
    for (const group of groups.length ? groups : [root]) {
        const rect = group.getBoundingClientRect();
        blocks.push({signature: signature(group), x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, text: name(group)});
    }
    return {hits, blocks};
}

async function sweepRoute(browser, demonstration, view, state) {
    const viewport = VIEWPORTS[view];
    const context = await browser.newContext({viewport, hasTouch: view === 'phone', isMobile: view === 'phone', reducedMotion: 'reduce'});
    const page = await context.newPage();
    const route = demonstration.path.replace(/^\/bezeg-2\.0\//, '');
    try {
        await page.goto(`http://127.0.0.1:${PORT}/bezeg-2.0/${route}`, {waitUntil: 'networkidle', timeout: 90000});
        if (view === 'present') {
            await page.getByRole('button', {name: /Predstavitveni način|Presentation mode/}).click();
            await page.getByRole('button', {name: /Odpri orodja|Open tools/}).click();
        }
        await page.waitForSelector('#workspace-inspector', {timeout: 30000});
        // The inspector scrolls inside a fixed height; let it grow so a crop shows a whole block. Widths are unchanged.
        await page.addStyleTag({content: '.workspace-inspector{height:auto !important;max-height:none !important;overflow:visible !important} #inspector-content{overflow:visible !important;flex:none !important;height:auto !important;max-height:none !important} .demonstration-workspace{align-items:start !important}'});
        const tabs = page.locator('.inspector-tabs button');
        const count = Math.max(1, await tabs.count());
        for (let tab = 0; tab < count; tab++) {
            if (await tabs.count()) await tabs.nth(tab).click();
            await page.evaluate(() => { for (const details of document.querySelectorAll('#workspace-inspector details')) details.open = true; });
            await page.waitForTimeout(250);
            const result = await page.evaluate(inspect);
            for (const found of result.hits) state.hits.push({route, view, tab, ...found});
            for (const block of result.blocks) {
                const key = `${view}|${block.signature}`;
                const known = state.blocks.get(key);
                if (known) { known.routes.add(route); if (block.height <= known.height + 8) continue; }
                const file = path.join(OUT, view, 'blocks', `${String(known ? known.id : state.blocks.size).padStart(4, '0')}.png`);
                fs.mkdirSync(path.dirname(file), {recursive: true});
                if (block.width < 2 || block.height < 2) continue;
                await page.screenshot({path: file, fullPage: true, clip: {x: Math.max(0, block.x - 4), y: Math.max(0, block.y - 4), width: block.width + 8, height: Math.min(block.height + 8, 2400)}});
                state.blocks.set(key, {id: known ? known.id : state.blocks.size, view, file, height: block.height, width: block.width, example: route, tab, text: block.text, routes: known ? known.routes : new Set([route])});
            }
        }
    } catch (error) {
        state.errors.push(`${view} ${route}: ${error.message.split('\n')[0]}`);
    } finally {
        await context.close();
    }
}

async function contactSheets(browser, view, blocks) {
    const page = await browser.newPage({viewport: {width: 1500, height: 1000}});
    const perSheet = 12;
    const ordered = [...blocks].sort((a, b) => b.routes.size - a.routes.size);
    for (let at = 0, sheet = 1; at < ordered.length; at += perSheet, sheet++) {
        const cells = ordered.slice(at, at + perSheet).map(block => {
            const image = fs.readFileSync(block.file).toString('base64');
            return `<figure><img src="data:image/png;base64,${image}"><figcaption>#${block.id} · ${block.routes.size} route(s) · ${block.example} · tab ${block.tab + 1}</figcaption></figure>`;
        }).join('');
        await page.setContent(`<style>body{margin:16px;font:13px system-ui;background:#ddd;columns:4;column-gap:16px}figure{margin:0 0 16px;break-inside:avoid;background:#fff;padding:6px}img{max-width:100%;display:block}figcaption{padding-top:4px;color:#333}</style>${cells}`);
        await page.screenshot({path: path.join(OUT, view, `sheet-${String(sheet).padStart(2, '0')}.png`), fullPage: true});
    }
    await page.close();
}

(async () => {
    const routes = catalog.filter(demonstration => ROUTES.test(demonstration.path));
    const state = {hits: [], blocks: new Map(), errors: []};
    fs.mkdirSync(OUT, {recursive: true});
    const browser = await chromium.launch();
    try {
        for (const view of VIEWS) {
            const queue = [...routes];
            await Promise.all(Array.from({length: WORKERS}, async () => {
                for (let next = queue.shift(); next; next = queue.shift()) await sweepRoute(browser, next, view, state);
            }));
            await contactSheets(browser, view, [...state.blocks.values()].filter(block => block.view === view));
            console.log(`${view}: ${routes.length} routes, ${[...state.blocks.values()].filter(block => block.view === view).length} compositions`);
        }
    } finally {
        await browser.close();
    }
    fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify({hits: state.hits, errors: state.errors, blocks: [...state.blocks.values()].map(block => ({...block, routes: [...block.routes]}))}, null, 1));
    const detectors = [...new Set(state.hits.map(found => found.detector))];
    const lines = ['# Controls sweep', '', `Routes: ${routes.length}. Views: ${VIEWS.join(', ')}. Errors: ${state.errors.length}.`, '', '| Detector | Hits | Routes | Examples |', '| --- | --- | --- | --- |'];
    for (const detector of detectors.sort((a, b) => new Set(state.hits.filter(h => h.detector === b).map(h => h.route)).size - new Set(state.hits.filter(h => h.detector === a).map(h => h.route)).size)) {
        const found = state.hits.filter(h => h.detector === detector);
        const where = [...new Set(found.map(h => h.route))];
        lines.push(`| ${detector} | ${found.length} | ${where.length} | ${found.slice(0, 3).map(h => `${h.route} (${h.view}): ${h.what.replace(/\|/g, '/')} — ${h.detail}`).join('; ')} |`);
    }
    lines.push('', ...state.errors.map(error => `- error: ${error}`));
    fs.writeFileSync(path.join(OUT, 'summary.md'), lines.join('\n'));
    console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${state.hits.length} hits, ${state.errors.length} errors`);
})().catch(error => { console.error(error); process.exit(1); });
