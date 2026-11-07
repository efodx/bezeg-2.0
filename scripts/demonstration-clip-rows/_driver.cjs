'use strict';
// Captures one row clip: opens the lesson example, hides the lesson overlay, then performs the row's supported input for 96 frames.
// Beside captureSweep and captureDrag in demonstration-preview-motion.cjs, which pass their shared helpers in as `kit`
// (this module must not require that file: it requires this one).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {recipes, applyRecipe, readSurfaceFraming, sameCamera, pointsOutsideFrame, settle} = require('../demonstration-preview-recipes.cjs');
const {drivenMotions} = require('./_schema.cjs');
const {newExampleContext, openExampleScene} = require('./_examples.cjs');

// Shared timing, as movePhase in the motion module: 12 holds, 71 moving frames, 13 holds. The pointer is down from PRESS to RELEASE.
const PRESS = 11, RELEASE = 84;
const frameName = i => String(i).padStart(3, '0') + '.png';
const plainName = name => String(name).replace(/[$\s]/g, '');

/** Eased position along the waypoint polyline at frame i, one cosine ease per leg (the shape sweepValue uses). */
function pathAt(i, waypoints, kit) {
    const scaled = kit.movePhase(i) * (waypoints.length - 1);
    const leg = Math.min(waypoints.length - 2, Math.floor(scaled));
    const eased = (1 - Math.cos(Math.PI * (scaled - leg))) / 2;
    const from = waypoints[leg], to = waypoints[leg + 1];
    return Array.isArray(from) ? from.map((value, axis) => value + (to[axis] - value) * eased) : from + (to - from) * eased;
}

/**
 * Pixel rectangles {x, y, width, height} of the board's text in the frame screenshotBoard just took: JSXGraph text is an svg <text>
 * or an html .JXGtext node inside #jgbox. Frames are device scale 2 (see screenshotBoard), so css pixels double.
 */
async function textRects(page) {
    return page.locator('#jgbox').evaluate(host => {
        const base = host.getBoundingClientRect();
        const rects = [];
        for (const node of host.querySelectorAll('svg text, .JXGtext')) {
            const r = node.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            const style = getComputedStyle(node);
            if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
            const x = (r.left - base.left) * 2, y = (r.top - base.top) * 2;
            rects.push({x: Math.floor(x), y: Math.floor(y), width: Math.ceil(r.width * 2) + 1, height: Math.ceil(r.height * 2) + 1});
        }
        return rects;
    });
}

/** Screenshot of the board plus the text rectangles of that very frame (kept on the capture until captureRow takes their union). */
async function shoot(kit, page, file) {
    const capture = await kit.screenshotBoard(page, file);
    return {...capture, textRects: await textRects(page)};
}

/** The unique rectangles over all frames, removed from the per-frame captures: a clip is masked with the union of what its text covered at any frame. */
function unionRects(samples) {
    const seen = new Map();
    for (const sample of samples) {
        for (const r of sample.capture.textRects ?? []) seen.set(`${r.x},${r.y},${r.width},${r.height}`, r);
        delete sample.capture.textRects;
    }
    return [...seen.values()];
}

const rowSchedule = row => row.motion === 'discrete-exact-steps'
    ? {kind: `row-${row.motion}`, checkpoints: row.path, holds: discreteHolds(row, 96)}
    : {kind: `row-${row.motion}`, hold: 12, moveFrames: 71, waypoints: row.path, ...(row.motion === 'pointer-drag' ? {press: PRESS, release: RELEASE} : {})};
// Every string below names a check that runs: the state check (assessRowState, in capture and again in assertRowEvidence), the
// camera assertions of the capture loops and assertRowEvidence, the loop-closing checksum test, the capture script's poster
// comparison (recipe-aligned ids) and the stored pixel step list (assessFrameSteps).
const rowInvariants = row => row.motion === 'discrete-exact-steps'
    ? [`The value shown next to "${row.control.label}" is read back at every checkpoint and equals the start value plus presses times step`, 'Camera is fixed for all 96 frames', 'The last checkpoint is the example scene and the last frame equals the first (the loop closes)', 'First and last frames match the example-scene poster']
    : row.motion === 'parameter-sweep'
    ? [`The input of "${row.control.label}" read back from the page matches the scheduled value every frame, and the schedule has no large step`, 'Camera is fixed for all 96 frames', 'First and last frames match the example-scene poster', 'Consecutive decoded frames never jump (stored step list)']
    : [`The moved point read back from the page follows the scheduled pointer path every frame, and the schedule has no large step`, 'Camera is fixed for all 96 frames', 'The last frame equals the first (the loop closes)', 'First and last frames match the example-scene poster', 'Consecutive decoded frames never jump (stored step list)'];

/**
 * State check of a captured row: what the app really showed (slider readback, board coordinates of the moved point, or the
 * point's screen position on a surface) against the schedule. Re-run by assertRowEvidence on the stored samples.
 */
function assessRowState(row, samples, surface) {
    const {assessPathSteps} = require('./_jump.cjs');
    const unresponsive = boardUnresponsiveFrame(row, samples);
    if (row.motion === 'discrete-exact-steps') {
        // Steps between checkpoints are the design, so there is no smoothness limit: every frame must show exactly its checkpoint's value, and every checkpoint must appear.
        const wrong = samples.findIndex(s => s.actual.input !== s.target);
        const missing = row.path.filter((_, k) => !samples.some(s => s.checkpoint === k));
        const reason = wrong >= 0 ? `frame ${wrong} shows ${samples[wrong].actual.input} but its checkpoint expects ${samples[wrong].target}` : missing.length ? 'a checkpoint has no frames' : unresponsive >= 0 ? unresponsiveReason(unresponsive) : null;
        return {ok: reason === null, reason, maxDeviation: wrong >= 0 ? Math.abs(samples[wrong].actual.input - samples[wrong].target) : 0, worstFrame: Math.max(wrong, 0), checkpointsReached: row.path.length - missing.length, tolerance: 0};
    }
    if (row.motion === 'parameter-sweep') {
        const result = assessPathSteps({scheduled: samples.map(s => s.target), observed: samples.map(s => s.actual.input), tolerance: 1e-9});
        return result.ok && unresponsive >= 0 ? {...result, ok: false, reason: unresponsiveReason(unresponsive), worstFrame: unresponsive} : result;
    }
    return assessPathSteps({scheduled: samples.map(s => [s.target.x, s.target.y]), observed: samples.map(s => [s.actual.x, s.actual.y]), tolerance: surface ? SURFACE_TOLERANCE : 1e-3});
}

/** Surface drag: the point's screen position may differ from the schedule by this many pixels (measured worst 0.00106; one frame step is about 0.63). */
const SURFACE_TOLERANCE = 0.05;
const unresponsiveReason = frame => `the app did not respond to the control at frame ${frame}: the input changed but the board is identical to the previous frame`;
/**
 * First frame whose slider/stepper value differs from the previous frame while the board (stored curve path hash and point
 * positions, neither derived from the input) does not, or -1. No allowance: an input the app ignores must fail.
 */
function boardUnresponsiveFrame(row, samples) {
    if (row.motion !== 'parameter-sweep' && row.motion !== 'discrete-exact-steps') return -1;
    const board = s => JSON.stringify([s.curvePathHash, s.points]);
    return samples.findIndex((s, i) => i > 0 && s.actual.input !== samples[i - 1].actual.input && board(s) === board(samples[i - 1]));
}

async function captureRow(browser, d, row, directory, baseUrl, presentBoard, kit) {
    assert.ok(drivenMotions.includes(row.motion), `${row.id}: the row driver does not capture "${row.motion}" yet`);
    const surface = d.view === 'surface';
    const discrete = row.motion === 'discrete-exact-steps';
    assert.ok(!(discrete && surface), `${row.id}: discrete-exact-steps is built for board scenes only`);
    const context = discrete ? null : await newExampleContext(browser);
    const page = discrete ? null : await context.newPage();
    page?.setDefaultTimeout(20000);
    try {
        if (!discrete) await openExampleScene(page, row, baseUrl, {surface});
        const result = discrete ? await captureDiscrete(browser, d, row, directory, baseUrl, presentBoard, kit)
            : surface ? await dragSurface(page, d, row, directory, kit)
                : row.motion === 'parameter-sweep' ? await sweepBoard(page, d, row, directory, presentBoard, kit)
                    : await dragBoard(page, d, row, directory, presentBoard, kit);
        // Frame-to-frame change of the decoded PNGs, kept in the record so the offline validation re-runs the same check.
        const {frameSteps, assessFrameSteps} = require('./_jump.cjs');
        const buffers = Array.from({length: kit.frameCount}, (_, i) => fs.readFileSync(path.join(directory, frameName(i))));
        const {ignoredRatio, MAX_IGNORED_RATIO} = require('./_jump.cjs');
        const rects = unionRects(result.samples);
        const ignored = {rects, ratio: ignoredRatio(result.samples[0].capture.width, result.samples[0].capture.height, rects)};
        assert.ok(ignored.ratio <= MAX_IGNORED_RATIO, `${row.id}: the text regions ignored by the pixel check cover ${(ignored.ratio * 100).toFixed(1)} percent of the frame, over the ${MAX_IGNORED_RATIO * 100} percent limit; a mask that large hides the picture, so fix the row or the scene, do not raise the limit`);
        const steps = frameSteps(buffers, {ignore: rects});
        const assessment = assessFrameSteps(steps, {discrete});
        const pathState = assessRowState(row, result.samples, surface);
        // Both checks report in one message, so a failure shows which of them caught the clip.
        const failures = [];
        if (!pathState.ok) failures.push(`state check failed: ${pathState.reason}`);
        if (!assessment.ok) failures.push(`pixel check failed: largest step ${assessment.max} is ${assessment.ratio}x the typical ${assessment.typical} (limit ${assessment.threshold}x, ${rects.length} text regions ignored)`);
        assert.equal(failures.length, 0, `${row.id}: ${failures.join('; ')} [state check ${pathState.ok ? 'passed' : 'failed'}, pixel check ${assessment.ok ? 'passed' : 'failed'}]`);
        return {...result, jump: {steps, ...assessment}, ignored, pathState, schedule: rowSchedule(row), invariants: rowInvariants(row), cameraHeld: surface};
    } finally {await context?.close();}
}

/** Frames per checkpoint of a discrete row: 96 split evenly, the first checkpoints take the remainder. */
const discreteHolds = (row, frameCount) => row.path.map((_, i) => Math.floor(frameCount / row.path.length) + (i < frameCount % row.path.length ? 1 : 0));

/**
 * discrete-exact-steps: the named stepper button is pressed to each checkpoint's cumulative count, every checkpoint on a fresh example
 * scene (no control undoes a step), then held. The value shown next to the button must reach start + count x step at every checkpoint.
 * Pixel and schedule smoothness do not apply; the camera and the loop closing still do.
 */
async function captureDiscrete(browser, d, row, directory, baseUrl, presentBoard, kit) {
    const holds = discreteHolds(row, kit.frameCount);
    let fixedBox, startValue, frame = 0;
    const samples = [];
    for (let k = 0; k < row.path.length; k++) {
        const context = await newExampleContext(browser);
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        try {
            await openExampleScene(page, row, baseUrl, {});
            await presentFixed(page, d, presentBoard, fixedBox);
            const button = page.getByRole('button', {name: row.control.label, exact: true});
            assert.equal(await button.count(), 1, `${row.id}: button "${row.control.label}" is missing or ambiguous (copy the accessible name from route-probe.json)`);
            for (const tab of ['Prikaz', 'Uredi']) { if (await button.isVisible()) break; await page.getByRole('button', {name: tab, exact: true}).click(); }
            // The value the stepper shows is the text input in the same group as the button.
            const readout = button.locator('xpath=..').locator('input').first();
            assert.equal(await readout.count(), 1, `${row.id}: no value input next to "${row.control.label}" to read the stepper back`);
            const parse = value => Number(String(value).replace('−', '-').replace(',', '.'));
            const first = parse(await readout.inputValue());
            if (k === 0) startValue = first; else assert.equal(first, startValue, `${row.id}: a fresh example scene starts at ${first}, not ${startValue}`);
            for (let press = 0; press < row.path[k]; press++) { await button.click(); await settle(page); }
            await settle(page);
            await presentFixed(page, d, presentBoard, fixedBox);
            const shown = parse(await readout.inputValue());
            const expected = startValue + row.path[k] * row.control.step;
            assert.equal(shown, expected, `${row.id}: after ${row.path[k]} presses the control shows ${shown}, not ${expected}`);
            const state = await kit.boardSnapshot(page);
            fixedBox ||= state.box;
            kit.assertCamera(state.box, fixedBox, 'Camera changed between checkpoints');
            for (const p of state.points) assert.ok(p.x >= fixedBox[0] && p.x <= fixedBox[2] && p.y <= fixedBox[1] && p.y >= fixedBox[3], `${row.id}: point ${p.id} left the fixed camera at checkpoint ${k}`);
            const capture = await shoot(kit, page, path.join(directory, frameName(frame)));
            for (let h = 0; h < holds[k]; h++) {
                const name = frameName(frame + h);
                if (h) fs.copyFileSync(path.join(directory, frameName(frame)), path.join(directory, name));
                samples.push({index: frame + h, time: (frame + h) / 24, checkpoint: k, presses: row.path[k], target: expected, actual: {input: shown, presses: row.path[k]}, capture: {...capture, file: name},
                    cameraBox: state.box, points: state.points.map(({id, name, x, y, draggable}) => ({id, name, x, y, draggable})), strokeWidths: state.strokeWidths,
                    curvePathHash: kit.pathHash(state.paths), pathCount: kit.countPaths(state.paths)});
            }
            frame += holds[k];
        } finally {await context.close();}
    }
    return {camera: fixedBox, samples};
}

async function presentFixed(page, d, boardPresent, camera) {
    const recipe = recipes[d.id];
    const presentation = recipe.framing.kind === 'coordinate-window' ? {window: recipe.framing.window} : {};
    return boardPresent(page.locator('#jgbox'), d, recipe, camera ? {...presentation, camera} : presentation);
}

/** Parameter sweep of a range or number control, as captureSweep does for the legacy clips. */
async function sweepBoard(page, d, row, directory, presentBoard, kit) {
    const poster = await presentFixed(page, d, presentBoard);
    const initial = await kit.boardSnapshot(page); const fixedBox = initial.box;
    assert.deepEqual(fixedBox, poster.boundingBox, `${row.id}: the poster fit must be the clip camera`);
    let control = page.getByLabel(row.control.label, {exact: true});
    assert.equal(await control.count(), 1, `${row.id}: control "${row.control.label}" is missing or ambiguous (copy the accessible label from route-probe.json)`);
    for (const tab of ['Prikaz', 'Uredi']) { if (await control.isVisible()) break; await page.getByRole('button', {name: tab, exact: true}).click(); }
    assert.ok(await control.isVisible(), `${row.id}: control "${row.control.label}" stays hidden in every inspector tab`);
    const rangeId = await control.getAttribute('id');
    // The id survives a label that embeds the value; a control without an id keeps its label locator.
    const range = rangeId ? page.locator(`[id=${JSON.stringify(rangeId)}]`) : control;
    const parse = value => Number(String(value).replace('−', '-').replace(',', '.'));
    let previousValue = parse(await range.inputValue());
    assert.ok(Math.abs(previousValue - row.path[0]) < 1e-9, `${row.id}: the example starts at ${previousValue}, but the row path starts at ${row.path[0]}`);
    const known = new Map(initial.strokesById);
    const samples = [];
    for (let i = 0; i < kit.frameCount; i++) {
        const target = kit.sweepValue(i, {sweep: {waypoints: row.path, step: row.control.step}});
        const steps = Math.round((target - previousValue) / row.control.step);
        if (row.control.kind === 'number' && Math.abs(target - previousValue) > 1e-12) { await range.fill(String(target)); await range.press('Tab'); }
        else if (steps) { await range.focus(); for (let k = 0; k < Math.abs(steps); k++) await range.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft'); }
        await settle(page);
        await presentFixed(page, d, presentBoard, fixedBox);
        const value = parse(await range.inputValue());
        assert.ok(Math.abs(value - target) < 1e-9, `${row.id}: input ${value} differs from the scheduled ${target} at frame ${i}; if the control is coarse or integer-valued and cannot follow a smooth schedule, make the row motion "discrete-exact-steps" with a discreteReason`);
        const state = await kit.boardSnapshot(page);
        kit.assertCamera(state.box, fixedBox, 'Camera changed between sweep frames');
        for (const [id, width] of state.strokesById) { if (known.has(id)) assert.equal(width, known.get(id), `${row.id}: stroke width changed for ${id}`); else known.set(id, width); }
        for (const p of state.points) assert.ok(p.x >= fixedBox[0] && p.x <= fixedBox[2] && p.y <= fixedBox[1] && p.y >= fixedBox[3], `${row.id}: point ${p.id} left the fixed camera at frame ${i}`);
        const capture = await shoot(kit, page, path.join(directory, frameName(i)));
        samples.push({index: i, time: i / 24, target, actual: {input: value, steps}, capture, cameraBox: state.box,
            points: state.points.map(({id, name, x, y, draggable}) => ({id, name, x, y, draggable})), strokeWidths: state.strokeWidths,
            curvePathHash: kit.pathHash(state.paths), pathCount: kit.countPaths(state.paths)});
        previousValue = value;
    }
    return {camera: fixedBox, samples};
}

/** Pointer drag of one control point of a curve board: press, follow the path in screen space, release at the exact start. */
async function dragBoard(page, d, row, directory, presentBoard, kit) {
    await presentFixed(page, d, presentBoard);
    const initial = await kit.boardSnapshot(page); const fixedBox = initial.box;
    const matches = initial.points.filter(p => p.draggable && plainName(p.name) === plainName(row.control.name));
    assert.equal(matches.length, 1, `${row.id}: expected one draggable point named "${row.control.name}"; draggable names are ${JSON.stringify(initial.points.filter(p => p.draggable).map(p => p.name))}`);
    const start = matches[0];
    assert.ok(Math.hypot(start.x - row.path[0][0], start.y - row.path[0][1]) < 0.02, `${row.id}: the point starts at (${start.x}, ${start.y}), but the row path starts at (${row.path[0]})`);
    // The first and last waypoint are the point's real coordinates, so the release returns to the exact start.
    const waypoints = [[start.x, start.y], ...row.path.slice(1, -1), [start.x, start.y]];
    const screen = (x, y) => page.locator('#jgbox').evaluate((e, {x, y}) => {const b = Object.values(window.JXG.boards).find(b => b.container === 'jgbox'); const r = e.getBoundingClientRect(); return {x: r.left + b.origin.scrCoords[1] + b.unitX * x, y: r.top + b.origin.scrCoords[2] - b.unitY * y};}, {x, y});
    const known = new Map(initial.strokesById);
    const samples = [];
    for (let i = 0; i < kit.frameCount; i++) {
        const target = pathAt(i, waypoints, kit);
        if (i === PRESS) { const at = await screen(start.x, start.y); await page.mouse.move(at.x, at.y); await page.mouse.down(); }
        if (i > PRESS - 1 && i < RELEASE) { const at = await screen(target[0], target[1]); await page.mouse.move(at.x, at.y); }
        if (i === RELEASE) { await page.mouse.up(); await parkPointer(page, row); }
        await settle(page);
        await presentFixed(page, d, presentBoard, fixedBox);
        const state = await kit.boardSnapshot(page);
        kit.assertCamera(state.box, fixedBox, 'Camera changed during the drag');
        for (const [id, width] of state.strokesById) { if (known.has(id)) assert.equal(width, known.get(id), `${row.id}: stroke width changed for ${id}`); else known.set(id, width); }
        const actual = state.points.find(p => p.id === start.id);
        const others = state.points.filter(p => p.id !== start.id && initial.points.some(q => q.id === p.id && q.draggable));
        for (const p of others) { const q = initial.points.find(q => q.id === p.id); assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-9, `${row.id}: control ${p.id} moved at frame ${i}`); }
        for (const p of state.points) assert.ok(p.x >= fixedBox[0] && p.x <= fixedBox[2] && p.y <= fixedBox[1] && p.y >= fixedBox[3], `${row.id}: point ${p.id} left the fixed camera at frame ${i}`);
        const capture = await shoot(kit, page, path.join(directory, frameName(i)));
        samples.push({index: i, time: i / 24, target: {x: target[0], y: target[1]}, scheduled: {x: target[0], y: target[1]}, actual: {id: start.id, x: actual.x, y: actual.y},
            start: {x: start.x, y: start.y}, capture, cameraBox: state.box, points: state.points, strokeWidths: state.strokeWidths,
            curvePathHash: kit.pathHash(state.paths), pathCount: kit.countPaths(state.paths)});
    }
    await page.mouse.up();
    return {camera: fixedBox, samples};
}

/** Pointer drag of one control point of the surface view; the camera must stay equal to the poster's. */
async function dragSurface(page, d, row, directory, kit) {
    const frame = {width: 360, height: 220};
    const host = page.locator('#jgbox');
    await host.evaluate((container, size) => {
        for (const [property, value] of [['border', '0px'], ['width', size.width + 'px'], ['height', size.height + 'px'],
            ['min-width', size.width + 'px'], ['max-width', size.width + 'px'], ['min-height', size.height + 'px'], ['max-height', size.height + 'px']]) container.style.setProperty(property, value, 'important');
    }, frame);
    await page.waitForFunction(size => {const raw = document.querySelector('#jgbox')?.getAttribute('data-surface-framing'); const f = raw && JSON.parse(raw); return !!f && f.width === size.width && f.height === size.height;}, frame);
    await settle(page);
    // The same camera fit the example-scene poster applies (captureSurface in capture-demonstration-previews.cjs), so poster and clip share one camera.
    await applyRecipe(page, {...recipes[d.id], actions: recipes[d.id].actions.filter(action => action.kind === 'button' && action.label === 'Ponastavi pogled')});
    await settle(page);
    const initial = await readSurfaceFraming(page);
    assert.ok(sameCamera(initial.camera, recipes[d.id].framing.camera), `${row.id}: the example camera ${JSON.stringify(initial.camera)} differs from the recipe camera; update surfaceCameras in demonstration-preview-recipes.cjs`);
    const start = initial.points.find(p => p.id === row.control.name);
    assert.ok(start, `${row.id}: no surface point "${row.control.name}"; published ids are ${JSON.stringify(initial.points.map(p => p.id))}`);
    const view = await page.locator('#jgbox [data-jsx-surface-view]').boundingBox();
    assert.ok(view, `${row.id}: missing surface view bounds`);
    const at = offset => ({x: view.x + start.x + offset[0], y: view.y + start.y + offset[1]});
    const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const samples = [];
    for (let i = 0; i < kit.frameCount; i++) {
        const target = pathAt(i, row.path, kit);
        if (i === PRESS) { const from = at([0, 0]); await page.mouse.move(from.x, from.y); await page.mouse.down(); }
        if (i > PRESS - 1 && i < RELEASE) { const to = at(target); await page.mouse.move(to.x, to.y); }
        if (i === RELEASE) { await page.mouse.up(); await parkPointer(page, row, true); }
        await frames();
        const framing = await readSurfaceFraming(page);
        assert.ok(sameCamera(framing.camera, initial.camera, 0), `${row.id}: the camera changed at frame ${i}: ${JSON.stringify(framing.camera)}`);
        assert.deepEqual(pointsOutsideFrame(framing.points, frame.width, frame.height), [], `${row.id}: a control point left the frame at frame ${i}`);
        const now = framing.points.find(p => p.id === start.id);
        const capture = await shoot(kit, page, path.join(directory, frameName(i)));
        samples.push({index: i, time: i / 24, target: {x: start.x + target[0], y: start.y + target[1]}, scheduled: {x: start.x + target[0], y: start.y + target[1]},
            actual: {id: start.id, x: now.x, y: now.y}, start: {x: start.x, y: start.y}, capture, cameraSurface: framing.camera, points: framing.points});
    }
    await page.mouse.up();
    return {camera: initial.camera, samples};
}

/** After the release the pointer would keep the point hovered (highlight, label) and the loop would not close; park it on an empty corner of the host. */
async function parkPointer(page, row, deselect = false) {
    const box = await page.locator('#jgbox').boundingBox();
    await page.mouse.move(box.x + 3, box.y + box.height - 3);
    // A surface point stays selected (blue, with its label) after a drag until the empty background is clicked.
    if (deselect) await clearSurfaceSelection(page, row);
}

/** Clears the point selection a drag leaves behind, through the Coons inspector's "Robna krivulja" select (empty option = no selection). Only the Coons surface is known; another surface needs its own control here. */
async function clearSurfaceSelection(page, row) {
    const select = page.getByLabel('Robna krivulja', {exact: true});
    assert.equal(await select.count(), 1, `${row.id}: no "Robna krivulja" select to clear the selection a drag leaves; add the control of this surface to clearSurfaceSelection in _driver.cjs`);
    for (const tab of ['Prikaz', 'Uredi']) { if (await select.isVisible()) break; await page.getByRole('button', {name: tab, exact: true}).click(); }
    await select.selectOption('');
}

module.exports = {captureRow, assessRowState, discreteHolds, pathAt, PRESS, RELEASE, SURFACE_TOLERANCE};
