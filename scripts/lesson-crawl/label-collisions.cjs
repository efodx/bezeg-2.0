#!/usr/bin/env node
// Label collision measurement for the frames of docs/specs/lesson-graph-label-collisions.md.
// For each frame it opens the guided example at the named progress text (or the bare route with --route) and lists
//   pairs:     a graph label whose box overlaps another label, an axis tick label, or a point marker that is not its own;
//   crossings: a drawn stroke (curve, segment, axis) that runs through a label's box.
// Usage: node scripts/lesson-crawl/label-collisions.cjs [--base http://127.0.0.1:4421] [--vp 1440x900] [--only LC-1a,LC-3]
//            [--route] [--shots <dir>] [--json <file>] [--dump]
// Exit code 0 always: this is a measurement, the spec says which numbers are acceptance.
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const FRAMES = [
    ['LC-1a', 'bezier/decasteljau', 'activity.bezier-curves.parameter.decasteljau', 'Okvir 2 od 2'],
    ['LC-1b', 'bezier/decasteljau', 'activity.bezier-curves.interpolation.decasteljau', 'Okvir 2 od 2'],
    ['LC-1c', 'bezier/subdivision-2', 'lesson.bezier-curves.next-ideas.subdivision', 'Korak 2 od 5 · Okvir 2 od 2'],
    ['LC-1d', 'rational/rational-decasteljau', 'lesson.rational-curves.homogeneous.rational-decasteljau', 'Korak 1 od 6 · Okvir 4 od 4'],
    ['LC-2', 'projective/cross-ratio', 'lesson.projective-conics.projective-cross-ratio.projective-cross-ratio', 'Korak 2 od 7 · Okvir 2 od 2'],
    ['LC-3', 'projective/five-point', 'lesson.projective-conics.projective-five-point.projective-five-point', 'Korak 2 od 9 · Okvir 2 od 2'],
    ['LC-4', 'compgeo/monotone-triangulation', 'lesson.sweep-algorithms.monotone-triangulation.monotone-triangulation', 'Korak 2 od 7 · Okvir 2 od 2'],
    ['LC-5', 'compgeo/segment-intersections', 'lesson.sweep-algorithms.segment-intersections.segment-intersections', 'Korak 2 od 7 · Okvir 2 od 2'],
    ['LC-6', 'linear-map', 'lesson.linear-maps.trace-determinant.linear-map', 'Korak 2 od 7 · Okvir 2 od 2'],
    ['LC-7', 'curve-geometry/descent', 'lesson.mechanical-curves.drag-the-track.mechanics-descent', 'Korak 2 od 7 · Okvir 2 od 2'],
    ['LC-8', 'triangle-solver', 'lesson.trigonometry.cosine-rule.triangle-solver', 'Korak 2 od 7 · Okvir 2 od 2'],
    ['LC-9', 'ph/quintic', 'lesson.ph-curves.offsets.ph-quintic', 'Korak 2 od 5 · Okvir 1 od 3'],
];

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = name => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const BASE = (opt('--base') || 'http://127.0.0.1:4421').replace(/\/$/, '');
const vp = opt('--vp') || '1440x900';
const only = (opt('--only') || '').split(',').filter(Boolean);
const shotDir = opt('--shots');
const jsonFile = opt('--json');
const bareRoute = flag('--route');
const dump = flag('--dump');

// Runs in the page. Boxes are in px from the board's top left corner.
function measureBoard() {
    const board = document.querySelector('#jgbox');
    if (!board) return {error: 'no board'};
    const clip = board.getBoundingClientRect();
    const visible = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05; };
    const rectOf = el => { const b = el.getBoundingClientRect(); return {l: b.left - clip.left, t: b.top - clip.top, r: b.right - clip.left, b: b.bottom - clip.top}; };
    const inside = r => r.r > 0 && r.b > 0 && r.l < clip.width && r.t < clip.height && r.r - r.l > 1 && r.b - r.t > 1;
    const items = [];
    board.querySelectorAll('.JXGtext').forEach(el => {
        if (!visible(el)) return;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        // The typeset child when there is exactly one: the text box can be wider than its ink.
        const math = el.querySelector('mjx-container');
        const r = rectOf(math && el.children.length === 1 ? math : el);
        if (!inside(r)) return;
        items.push({kind: /_ticks_/.test(el.id) ? 'tick' : 'label', id: el.id, text: text.slice(0, 40), ...r});
    });
    board.querySelectorAll('svg ellipse, svg rect, svg polygon').forEach(el => {
        if (!visible(el) || el.getAttribute('display') === 'none') return;
        const r = rectOf(el);
        const w = r.r - r.l, h = r.b - r.t;
        if (!inside(r) || w > 26 || h > 26 || w < 4 || h < 4) return;  // point markers only
        items.push({kind: 'point', id: el.id, text: '', ...r});
    });
    const pairs = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (a.kind !== 'label' && b.kind !== 'label') continue;
        const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ox <= 2 || oy <= 2) continue;
        // A point's own label has the id `<pointId>Label`.
        if ((a.kind === 'point' && b.id === a.id + 'Label') || (b.kind === 'point' && a.id === b.id + 'Label')) continue;
        pairs.push({a: `${a.kind}:${a.text || a.id}`, b: `${b.kind}:${b.text || b.id}`, ox: Math.round(ox), oy: Math.round(oy)});
    }
    const strokes = [...board.querySelectorAll('svg path, svg line, svg polyline')].filter(el => {
        if (!visible(el) || el.getAttribute('display') === 'none') return false;
        const s = getComputedStyle(el);
        if (s.stroke === 'none' || Number(s.strokeOpacity) < 0.3 || parseFloat(s.strokeWidth) < 0.9) return false;
        return !/grid|ticks/i.test(el.id) && typeof el.isPointInStroke === 'function';
    });
    const crossings = [];
    for (const it of items) {
        if (it.kind !== 'label') continue;
        for (const el of strokes) {
            const eb = rectOf(el);
            if (eb.r < it.l || eb.l > it.r || eb.b < it.t || eb.t > it.b) continue;
            const ctm = el.getScreenCTM();
            if (!ctm) continue;
            const inv = ctm.inverse();
            let hits = 0, total = 0;
            for (let x = it.l + 2; x <= it.r - 2; x += 2) for (let y = it.t + 3; y <= it.b - 3; y += 2) {
                total++;
                if (el.isPointInStroke(new DOMPoint(x + clip.left, y + clip.top).matrixTransform(inv))) hits++;
            }
            if (hits >= 4) crossings.push({label: it.text, stroke: el.id.replace(/^jgbox_jxgBoard\d+/, '') || el.tagName, hits, total});
        }
    }
    return {board: [Math.round(clip.width), Math.round(clip.height)], items, pairs, crossings};
}

async function runFrame(browser, [id, route, example, frame]) {
    const [width, height] = vp.split('x').map(Number);
    const page = await browser.newPage({viewport: {width, height}});
    const notes = [];
    try {
        await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'sl'));
        page.on('pageerror', e => notes.push('PAGEERROR ' + e.message.slice(0, 160)));
        await page.goto(`${BASE}/bezeg-2.0/${route}${bareRoute ? '' : `?example=${example}`}`, {waitUntil: 'domcontentloaded'});
        let at = 'route';
        if (bareRoute) await page.locator('#jgbox svg').first().waitFor({timeout: 20000});
        else {
            await page.locator('section.guided-lesson').waitFor({timeout: 20000});
            await page.waitForTimeout(1000);
            const progress = async () => ((await page.locator('.guided-lesson-progress').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
            const next = page.locator('section.guided-lesson .guided-lesson-nav-next');
            for (let i = 0; i < 80 && !(await progress()).includes(frame); i++) {
                await next.click().catch(e => notes.push('next failed: ' + e.message.split('\n')[0]));
                await page.waitForTimeout(350);
            }
            at = await progress();
            if (!at.includes(frame)) notes.push(`frame "${frame}" not reached`);
        }
        await page.waitForTimeout(1500);
        const result = await page.evaluate(measureBoard);
        if (shotDir) {
            fs.mkdirSync(shotDir, {recursive: true});
            const name = `${id}${bareRoute ? '-route' : ''}-${vp}`;
            await page.screenshot({path: path.join(shotDir, `${name}.png`)});
            await page.locator('section.workspace-graph').screenshot({path: path.join(shotDir, `${name}-graph.png`)}).catch(() => {});
        }
        return {id, route, example: bareRoute ? null : example, at, vp, notes, ...result};
    } catch (error) {
        return {id, route, example, at: 'failed', vp, notes: [...notes, String(error.message).split('\n')[0]], pairs: [], crossings: [], items: []};
    } finally {
        await page.close();
    }
}

(async () => {
    const frames = FRAMES.filter(f => only.length === 0 || only.includes(f[0]));
    const browser = await chromium.launch();
    const results = [];
    for (let i = 0; i < frames.length; i += 4) results.push(...await Promise.all(frames.slice(i, i + 4).map(f => runFrame(browser, f))));
    await browser.close();
    let pairs = 0, crossings = 0;
    for (const r of results) {
        pairs += r.pairs.length;
        crossings += r.crossings.length;
        console.log(`${r.id} | ${r.route} | ${r.vp} | ${r.at} | board ${r.board || '-'} | ${r.pairs.length} pair(s), ${r.crossings.length} crossing(s)`);
        for (const n of r.notes) console.log(`   ! ${n}`);
        for (const p of r.pairs) console.log(`   ${p.a}  x  ${p.b}  (${p.ox}x${p.oy}px)`);
        for (const c of r.crossings) console.log(`   stroke ${c.stroke} through "${c.label}" (${c.hits}/${c.total} samples)`);
        if (dump) for (const it of r.items) console.log(`   . ${it.kind} ${it.id} "${it.text}" ${Math.round(it.l)},${Math.round(it.t)} ${Math.round(it.r - it.l)}x${Math.round(it.b - it.t)}`);
    }
    console.log(`total: ${pairs} pair(s), ${crossings} crossing(s) in ${results.length} frame(s)`);
    if (jsonFile) fs.writeFileSync(jsonFile, JSON.stringify(results.map(r => ({...r, items: undefined})), null, 1));
})();
