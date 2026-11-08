const {test, expect} = require('@playwright/test');
const fs = require('node:fs/promises');

// Rendered-appearance contracts through the production build (docs/specs/rendered-graph-style-contracts.md,
// criteria 3, 5, 6, 7). Colours are the GraphPalette values the roles are meant to render, written out literally so a
// palette change has to be made here on purpose.
const COLORS = {
    controlPoint: '#bd8040',
    pointOutline: '#fffdf5',
    selectedFill: '#d39a4a',
    selectedOutline: '#654c2b',
    boardSurface: '#fffdf5',
};
const ROUTE = '/bezeg-2.0/rational/base';

const inspector = page => page.locator('.workspace-inspector');
const openTab = (page, name) => inspector(page).locator('.inspector-tabs').getByRole('button', {name, exact: true}).click();

// The visible marker of every control point, read from the rendered SVG element of the main board.
function markers(page) {
    return page.locator('#jgbox').evaluate(element => {
        const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        const rect = element.getBoundingClientRect();
        return board.objectsList.filter(o => o.elType === 'point' && o.rendNode?.tagName === 'ellipse' && o.rendNode.getAttribute('display') !== 'none').map(o => ({
            id: o.id,
            x: o.X(),
            y: o.Y(),
            fill: o.rendNode.getAttribute('fill'),
            stroke: o.rendNode.getAttribute('stroke'),
            rx: Number(o.rendNode.getAttribute('rx')),
            display: o.rendNode.getAttribute('display'),
            cx: o.rendNode.cx.baseVal.value,
            cy: o.rendNode.cy.baseVal.value,
            screenX: rect.left + o.rendNode.cx.baseVal.value,
            screenY: rect.top + o.rendNode.cy.baseVal.value,
        })).sort((a, b) => a.x - b.x);
    });
}
// Marker appearance without the page-relative screen position, which moves when the page scrolls.
const appearance = async page => (await markers(page)).map(({screenX: _x, screenY: _y, cx: _cx, cy: _cy, ...marker}) => marker);
const geometry = page => page.locator('#jgbox').evaluate(element => {
    const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
    return {box: board.getBoundingBox(), points: board.objectsList.filter(o => o.elType === 'point').map(o => [o.id, o.X(), o.Y()])};
});

// Point labels only: the axis tick labels are also div.JXGtext and are not governed by this switch.
const visiblePointLabelCount = page => page.locator('#jgbox').evaluate(element => {
    const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
    return board.objectsList.filter(o => o.elType === 'point' && o.label?.rendNode && o.rendNode.getAttribute('display') !== 'none')
        .filter(o => {
            const node = o.label.rendNode;
            const style = getComputedStyle(node);
            return node.getBoundingClientRect().width > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
});

async function openScene(page, errors) {
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
    await page.goto(ROUTE);
    await expect(page.locator('#jgbox svg')).toBeVisible();
    await expect.poll(async () => (await markers(page)).length).toBeGreaterThanOrEqual(4);
}

test('hover and rational weight selection change the marker outline and restore', async ({page}) => {
    const errors = [];
    await openScene(page, errors);
    await openTab(page, 'Edit');
    await page.locator('.curve-selection').getByRole('button').first().click();
    const before = await geometry(page);
    const initial = await markers(page);
    const selected = initial.filter(marker => marker.stroke === COLORS.selectedOutline);
    expect(selected).toHaveLength(1);
    expect(selected[0].fill).toBe(COLORS.selectedFill);
    const ordinary = initial.filter(marker => marker.stroke === COLORS.pointOutline);
    expect(ordinary.length).toBeGreaterThanOrEqual(3);
    for (const marker of ordinary) expect(marker.fill).toBe(COLORS.controlPoint);

    // Hover: an unselected point takes the highlight outline, and leaving restores the normal outline.
    // Read the screen position only after the board is in view, and approach in steps so JSXGraph sees pointer movement.
    await page.locator('#jgbox').scrollIntoViewIfNeeded();
    const target = (await markers(page)).find(m => m.id === ordinary[0].id);
    await page.mouse.move(target.screenX - 40, target.screenY - 40);
    await page.mouse.move(target.screenX, target.screenY, {steps: 8});
    await expect.poll(async () => (await markers(page)).find(m => m.id === target.id).stroke).toBe(COLORS.selectedOutline);
    const hovered = (await markers(page)).find(m => m.id === target.id);
    expect(hovered.fill).toBe(COLORS.selectedFill);
    await page.mouse.move(target.screenX + 150, target.screenY + 150);
    await expect.poll(async () => (await markers(page)).find(m => m.id === target.id).stroke).toBe(COLORS.pointOutline);
    expect((await markers(page)).find(m => m.id === target.id).fill).toBe(COLORS.controlPoint);

    // Selection: Next weight moves the highlight to a different point and restores the previous one.
    await page.getByRole('button', {name: 'Next weight', exact: true}).click();
    await expect.poll(async () => (await markers(page)).filter(m => m.stroke === COLORS.selectedOutline).map(m => m.id))
        .not.toEqual([selected[0].id]);
    const after = await markers(page);
    const nowSelected = after.filter(m => m.stroke === COLORS.selectedOutline);
    expect(nowSelected).toHaveLength(1);
    expect(nowSelected[0].fill).toBe(COLORS.selectedFill);
    const previous = after.find(m => m.id === selected[0].id);
    expect(previous.stroke).toBe(COLORS.pointOutline);
    expect(previous.fill).toBe(COLORS.controlPoint);

    expect(await geometry(page)).toEqual(before);
    expect(errors).toEqual([]);
});

test('size and point-label controls change the rendered markers and restore without moving geometry', async ({page}) => {
    const errors = [];
    await openScene(page, errors);
    await openTab(page, 'Display');
    const before = await geometry(page);
    const normal = await appearance(page);
    const labelCount = () => visiblePointLabelCount(page);
    const labelsOn = await labelCount();
    expect(labelsOn).toBeGreaterThan(0);

    await inspector(page).getByText('Element sizes', {exact: true}).click();
    const size = inspector(page).getByRole('slider', {name: 'Graph element size', exact: true});
    await size.fill('4');
    await expect.poll(async () => (await markers(page))[0].rx).toBeGreaterThan(normal[0].rx);
    const large = await appearance(page);
    for (const [index, marker] of large.entries()) {
        expect(marker.rx).toBeGreaterThan(normal[index].rx);
        expect(marker.fill).toBe(normal[index].fill);
        expect(marker.stroke).toBe(normal[index].stroke);
    }
    expect(await geometry(page)).toEqual(before);
    await size.fill('0');
    await expect.poll(async () => (await markers(page))[0].rx).toBe(normal[0].rx);
    expect(await appearance(page)).toEqual(normal);

    const labels = inspector(page).getByLabel('Point labels', {exact: true});
    await labels.setChecked(false);
    await expect.poll(labelCount).toBe(0);
    expect(await geometry(page)).toEqual(before);
    await labels.setChecked(true);
    await expect.poll(labelCount).toBe(labelsOn);
    expect(await appearance(page)).toEqual(normal);
    expect(await geometry(page)).toEqual(before);
    expect(errors).toEqual([]);
});

async function downloadFigure(page, button) {
    await openTab(page, 'Save');
    const downloadPromise = page.waitForEvent('download');
    await inspector(page).locator('#inspector-save').getByRole('button', {name: button, exact: true}).click();
    const download = await downloadPromise;
    return {name: download.suggestedFilename(), bytes: await fs.readFile(await download.path())};
}

// Decodes a downloaded figure in the page and reports pixels. `markerPoints` are in board CSS pixels; `sceneWidth` maps them to figure pixels.
function rasterProbe(page, {mime, base64, markerPoints, sceneWidth}) {
    return page.evaluate(async ({mime, base64, markerPoints, sceneWidth}) => {
        const image = new Image();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error(`${mime} did not decode`));
            image.src = `data:${mime};base64,${base64}`;
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(image, 0, 0);
        const pixel = (x, y) => Array.from(context.getImageData(Math.round(x), Math.round(y), 1, 1).data);
        const all = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const near = (r, g, b, hex, tolerance) => {
            const target = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
            return Math.abs(r - target[0]) <= tolerance && Math.abs(g - target[1]) <= tolerance && Math.abs(b - target[2]) <= tolerance;
        };
        const count = (hex, tolerance) => {
            let n = 0;
            for (let i = 0; i < all.length; i += 4) if (all[i + 3] > 250 && near(all[i], all[i + 1], all[i + 2], hex, tolerance)) n += 1;
            return n;
        };
        return {
            width: canvas.width, height: canvas.height,
            corners: [pixel(1, 1), pixel(canvas.width - 2, canvas.height - 2)],
            markerCenters: markerPoints.map(([x, y]) => pixel(x * canvas.width / sceneWidth, y * canvas.width / sceneWidth)),
            curve: count('#587445', 24), label: count('#4d594f', 24), controlPoint: count('#bd8040', 12),
        };
    }, {mime, base64, markerPoints, sceneWidth});
}

// Within this many pixels per channel a rendered pixel counts as the palette colour (anti-aliasing, PNG rounding).
const COLOUR_TOLERANCE = 24;
// A labelled formula is placed from its HTML box; one pixel of rounding is allowed between screen and file.
const LABEL_POSITION_TOLERANCE = 1.5;

test('downloaded SVG and PNG figures keep marker roles, labels, curve and background', async ({page}) => {
    const errors = [];
    await openScene(page, errors);
    const before = await geometry(page);
    const live = await markers(page);
    expect(live).toHaveLength(4);
    const scene = await page.locator('#jgbox').evaluate(element => {
        const board = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        const root = board.renderer.svgRoot.getBoundingClientRect();
        return {
            width: root.width, height: root.height,
            labels: board.objectsList.filter(o => o.elType === 'point' && o.label?.rendNode && o.rendNode.getAttribute('display') !== 'none')
                .map(o => {
                    const rect = (o.label.rendNode.querySelector('mjx-container') ?? o.label.rendNode).getBoundingClientRect();
                    return {x: rect.left - root.left, y: rect.top - root.top, width: rect.width, height: rect.height};
                }),
        };
    });
    expect(scene.labels).toHaveLength(4);

    // --- SVG ---
    const svg = await downloadFigure(page, 'SVG');
    expect(svg.name).toMatch(/\.svg$/);
    const svgText = svg.bytes.toString('utf8');
    const inspected = await page.evaluate(async ({svgText, centers}) => {
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const root = doc.documentElement;
        const ellipses = [...root.querySelectorAll('ellipse')].filter(e => e.getAttribute('display') !== 'none');
        const labels = [...root.querySelectorAll('g.bezeg-math-labels > svg')].map(n => ({
            x: Number(n.getAttribute('x')), y: Number(n.getAttribute('y')),
            width: Number(n.getAttribute('width')), height: Number(n.getAttribute('height')),
            glyphs: n.querySelectorAll('path, use').length,
        }));
        const image = new Image();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('the exported SVG did not render'));
            image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(Number(root.getAttribute('width')));
        canvas.height = Math.round(Number(root.getAttribute('height')));
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixel = (x, y) => Array.from(context.getImageData(Math.round(x), Math.round(y), 1, 1).data);
        return {
            hasBackgroundRect: [...root.querySelectorAll(':scope > rect')].length,
            markers: ellipses.map(e => ({fill: e.getAttribute('fill'), stroke: e.getAttribute('stroke'), width: parseFloat(e.getAttribute('stroke-width'))})),
            labels,
            corners: [pixel(1, 1), pixel(canvas.width - 2, canvas.height - 2)],
            centers: centers.map(([x, y]) => pixel(x, y)),
        };
    }, {svgText, centers: live.map(m => [m.cx, m.cy])});
    expect(inspected.hasBackgroundRect).toBe(0);
    for (const corner of inspected.corners) expect(corner[3]).toBe(0);
    const exportedControls = inspected.markers.filter(m => m.fill === COLORS.controlPoint || m.fill === COLORS.selectedFill);
    expect(exportedControls).toHaveLength(4);
    for (const marker of exportedControls) {
        expect([COLORS.pointOutline, COLORS.selectedOutline]).toContain(marker.stroke);
        expect(marker.width).toBeGreaterThan(0);
    }
    expect(inspected.markers.filter(m => m.stroke === COLORS.pointOutline && m.fill === COLORS.controlPoint)).toHaveLength(live.filter(m => m.fill === COLORS.controlPoint).length);
    expect(inspected.labels).toHaveLength(scene.labels.length);
    for (const expected of scene.labels) {
        const label = inspected.labels.find(candidate => Math.abs(candidate.x - expected.x) <= LABEL_POSITION_TOLERANCE
            && Math.abs(candidate.y - expected.y) <= LABEL_POSITION_TOLERANCE);
        expect(label, `a typeset label at ${expected.x},${expected.y}`).toBeDefined();
        expect(label.glyphs).toBeGreaterThan(0);
    }
    inspected.centers.forEach((pixel, index) => {
        expect(pixel[3]).toBe(255);
        const expectedFill = live[index].fill;
        [1, 3, 5].forEach((offset, channel) => expect(Math.abs(pixel[channel] - parseInt(expectedFill.slice(offset, offset + 2), 16))).toBeLessThanOrEqual(COLOUR_TOLERANCE));
    });

    // --- PNG ---
    const png = await downloadFigure(page, 'PNG');
    expect(png.name).toMatch(/\.png$/);
    const probe = await rasterProbe(page, {mime: 'image/png', base64: png.bytes.toString('base64'), markerPoints: live.map(m => [m.cx, m.cy]), sceneWidth: scene.width});
    const scale = probe.width / scene.width;
    expect(scale).toBeGreaterThanOrEqual(1);
    expect(Math.abs(probe.height - scene.height * scale)).toBeLessThanOrEqual(1);
    for (const corner of probe.corners) expect(corner).toEqual([255, 253, 245, 255]); // boardSurface, opaque
    probe.markerCenters.forEach((pixel, index) => {
        [1, 3, 5].forEach((offset, channel) => expect(Math.abs(pixel[channel] - parseInt(live[index].fill.slice(offset, offset + 2), 16))).toBeLessThanOrEqual(COLOUR_TOLERANCE));
    });
    // Visible curve, markers and labels: bounded counts of palette-coloured pixels, not whole-image hashes.
    expect(probe.curve).toBeGreaterThan(300);
    expect(probe.controlPoint).toBeGreaterThan(100);
    expect(probe.label).toBeGreaterThan(150);

    expect(await geometry(page)).toEqual(before);
    expect(errors).toEqual([]);
});
