'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const {readPublishedSurfaceEvidence, validateSurfaceEvidence} = require('./guided-example-surface-evidence.cjs');
const fs = require('node:fs');

const surfaceMotionIds = Object.freeze(['patch-tensor', 'patch-decasteljau', 'patch-derivatives', 'patch-subdivision', 'patch-joins', 'patch-triangular']);
// Independent samples of the shipped default fixtures. They are xyz vertices from the default mesh, not view or image data.
const ownerFixtures = Object.freeze({
    'patch-tensor': [{id:'tensor-patch-0',kind:'tensor',geometrySamples:[[-1.5,-1.5,0],[0,-1.5,0],[1.5,1.3125,0]]}],
    'patch-decasteljau': [{id:'tensor-patch-0',kind:'tensor',geometrySamples:[[-1.5,-1.5,0],[0,-1.5,0],[1.5,1.3125,0]]}],
    'patch-derivatives': [{id:'tensor-patch-0',kind:'tensor',geometrySamples:[[-1.5,-1.5,0],[0,-1.5,0],[1.5,1.3125,0]]}],
    'patch-subdivision': [{id:'tensor-patch-0',kind:'tensor',geometrySamples:[[-1.5,-1.5,0],[0,-1.5,0],[1.5,1.3125,0]]}],
    'patch-joins': [
        {id:'join-patch-a',kind:'join',geometrySamples:[[-1.5,-1.5,0],[0,-1.5,0],[1.5,1.3125,0]]},
        {id:'join-patch-b',kind:'join',geometrySamples:[[1.5,-1.5,0],[3,-1.5,0],[4.5,1.3125,0]]},
    ],
    'patch-triangular': [{id:'triangular-patch-0',kind:'triangular',geometrySamples:[[0,1.3,0],[0.375,-0.6500000000000001,1.03125],[-1.40625,-1.1375,0.17578125]]}],
});

function assertOwnerGeometry(actual, expected, id, tolerance = 1e-6) {
    assert.ok(Array.isArray(actual) && actual.length > 0, `${id}: rendered surface owners are empty`);
    assert.ok(Array.isArray(expected) && expected.length > 0, `${id}: expected surface owners are empty`);
    assert.equal(actual.length, expected.length, `${id}: rendered owner count differs`);
    for (const owner of expected) {
        const observed = actual.find(candidate => candidate.id === owner.id);
        assert.ok(observed, `${id}: missing rendered owner ${owner.id}`);
        assert.equal(observed.kind, owner.kind, `${id}: owner ${owner.id} has wrong kind`);
        assert.ok(Array.isArray(observed.geometrySamples) && observed.geometrySamples.length > 0, `${id}: owner ${owner.id} has no rendered geometry samples`);
        assert.equal(observed.geometrySamples.length, owner.geometrySamples.length, `${id}: owner ${owner.id} sample count differs`);
        owner.geometrySamples.forEach((point, sampleIndex) => point.forEach((coordinate, axis) => {
            assert.ok(Number.isFinite(observed.geometrySamples[sampleIndex]?.[axis]), `${id}: owner ${owner.id} sample is not finite`);
            assert.ok(Math.abs(observed.geometrySamples[sampleIndex][axis] - coordinate) <= tolerance,
                `${id}: owner ${owner.id} sample ${sampleIndex} differs from default fixture`);
        }));
    }
}

function surfaceRouteReadyInPage() {
    const host = document.querySelector('#jgbox');
    // Self-contained (Playwright serializes it): the host's SVG surface view has a size and a shown polygon/polyline with points.
    const svg = host?.querySelector('[data-jsx-surface-view] svg');
    if (!svg) return false;
    const rect = svg.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return false;
    const drawn = [...svg.querySelectorAll('polygon, polyline')].some(node => node.getAttribute('display') !== 'none' && (node.getAttribute('points') || '').trim().split(/\s+/).length >= 2);
    if (!drawn) return false;
    try {
        const framing = JSON.parse(host.getAttribute('data-surface-framing') || 'null');
        const owners = JSON.parse(host.getAttribute('data-rendered-surface-owners') || 'null');
        return Number.isFinite(framing?.camera?.az) && Number.isFinite(framing?.camera?.el)
            && Number.isFinite(framing?.width) && Number.isFinite(framing?.height)
            && Array.isArray(owners) && owners.length > 0 && owners.every(owner => Array.isArray(owner.geometrySamples) && owner.geometrySamples.length > 0);
    } catch { return false; }
}

async function presentSurface(page, id) {
    assert.ok(surfaceMotionIds.includes(id), `Unknown surface motion ${id}`);
    const host = page.locator('#jgbox');
    await host.waitFor({state:'visible'});
    await host.evaluate(container => {
        for (const [property, value] of [['border','0px'],['width','360px'],['height','220px'],['min-width','360px'],['max-width','360px'],['min-height','220px'],['max-height','220px']]) {
            container.style.setProperty(property,value,'important');
        }
    });
    await page.waitForFunction(() => {
        const framing = JSON.parse(document.querySelector('#jgbox')?.getAttribute('data-surface-framing') || 'null');
        return framing?.width === 360 && framing?.height === 220;
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const current = await readPublishedSurfaceEvidence(page);
    validateSurfaceEvidence({...current,expected:{camera:current.framing.camera,owners:ownerFixtures[id],cameraTolerance:1e-6}});
    return current;
}

function readPngDimensions(file) {
    const data = fs.readFileSync(file);
    assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a','Frame is not a PNG');
    assert.equal(data.toString('ascii',12,16),'IHDR','Frame PNG has no leading IHDR');
    const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
    assert.ok(width>0&&height>0,'Frame PNG has invalid dimensions');
    return {width,height};
}

function assertSurfaceMotionEvidence(motion, fixtures = ownerFixtures) {
    const expected = fixtures[motion?.id];
    assert.ok(expected, `${motion?.id}: missing default surface geometry fixture`);
    assert.equal(motion.mode, 'surface-orbit', `${motion.id}: wrong motion mode`);
    assert.equal(motion.frameCount, 96, `${motion.id}: wrong frame count`);
    assert.ok(Array.isArray(motion.samples) && motion.samples.length === motion.frameCount, `${motion.id}: missing orbit samples`);
    const first = motion.samples[0], last = motion.samples.at(-1);
    assert.ok(first?.observed?.renderedOwners?.length, `${motion.id}: first frame has no rendered owner evidence`);
    const originalCamera = first.observed.camera;
    assertCamera(originalCamera, motion.id, 'first frame');
    let changed = false;
    motion.samples.forEach((sample, index) => {
        assert.equal(sample.index, index, `${motion.id}: wrong frame index`);
        assert.ok(sample.capture?.sha256, `${motion.id}: frame ${index} has no captured image`);
        assertCamera(sample.observed?.camera, motion.id, `frame ${index}`);
        assertOwnerGeometry(sample.observed.renderedOwners, expected, motion.id);
        assert.ok(Math.abs(sample.observed.camera.distance - originalCamera.distance) < 1e-9, `${motion.id}: orbit changed camera distance at frame ${index}`);
        assert.deepEqual(sample.observed.camera.target, originalCamera.target, `${motion.id}: orbit changed camera target at frame ${index}`);
        if (Math.abs(sample.observed.camera.az - originalCamera.az) > 1e-4 || Math.abs(sample.observed.camera.el - originalCamera.el) > 1e-4) changed = true;
    });
    assert.ok(changed, `${motion.id}: actual surface camera never moved`);
    assert.deepEqual(last.observed.camera, originalCamera, `${motion.id}: orbit did not return to the recipe camera`);
    assert.equal(last.capture.sha256, first.capture.sha256, `${motion.id}: orbit loop PNG differs from the recipe frame`);
    return true;
}

function assertCamera(camera, id, where) {
    assert.ok(camera && Number.isFinite(camera.az) && Number.isFinite(camera.el) && Number.isFinite(camera.distance) && camera.distance > 0,
        `${id}: ${where} has invalid camera coordinates`);
    assert.ok(Array.isArray(camera.target) && camera.target.length === 3 && camera.target.every(Number.isFinite), `${id}: ${where} has invalid camera target`);
}

async function captureSurfaceOrbit(page, id, directory, recipe) {
    assert.ok(surfaceMotionIds.includes(id), `Unknown surface motion ${id}`);
    const expected = ownerFixtures[id];
    const evidence = await readPublishedSurfaceEvidence(page);
    const valid = validateSurfaceEvidence({...evidence, expected:{camera:recipe.framing.camera, owners:expected,cameraTolerance:1e-6}});
    const startCamera = valid.camera;
    const box = await page.locator('#jgbox [data-jsx-surface-view]').boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, `${id}: missing surface view bounds`);
    const bounds = evidence.framing.meshBounds;
    const candidates = [[box.x+4,box.y+4],[box.x+box.width-4,box.y+4],[box.x+4,box.y+box.height-4],[box.x+box.width-4,box.y+box.height-4]];
    const start = candidates.find(([x,y]) => {
        const localX=x-box.x,localY=y-box.y;
        return localX < bounds.left-4 || localX > bounds.right+4 || localY < bounds.top-4 || localY > bounds.bottom+4;
    });
    assert.ok(start, `${id}: cannot find a clear surface-view corner outside the rendered mesh for orbit input`);
    const [mouseX,mouseY] = start;
    const samples = [];
    await page.mouse.move(mouseX, mouseY);
    await page.mouse.down();
    try {
        for (let index = 0; index < 96; index++) {
            const phase = Math.max(0, Math.min(1, (index - 8) / 71));
            const displacement = Math.sin(Math.PI * phase) ** 2;
            await page.mouse.move(mouseX + 40 * displacement, mouseY + 10 * displacement, {steps:1});
            if (index === 88) {
                await page.mouse.up();
                await page.getByRole('button', {name:'Ponastavi pogled', exact:true}).click();
            }
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const current = await readPublishedSurfaceEvidence(page);
            const checked = validateSurfaceEvidence({...current,expected:{camera:current.framing.camera,owners:expected,cameraTolerance:1e-6}});
            assertCamera(checked.camera,id,`frame ${index}`);
            const file = path.join(directory, `${String(index).padStart(3,'0')}.png`);
            const clip = await page.locator('#jgbox').evaluate(host => {
                const rect=host.getBoundingClientRect();
                return {x:rect.left,y:rect.top,width:host.clientWidth,height:host.clientHeight};
            });
            await page.screenshot({path:file,clip,animations:'disabled',caret:'hide',scale:'device'});
            const dimensions = readPngDimensions(file);
            const capture = {file:path.basename(file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),...dimensions};
            assert.deepEqual(dimensions,{width:720,height:440},`${id}: frame ${index} does not match the shared preview dimensions`);
            samples.push({index,capture,observed:{camera:checked.camera,renderedOwners:checked.renderedOwners}});
        }
    } finally {
        await page.mouse.up();
    }
    const motion = {id,mode:'surface-orbit',frameCount:96,sampleRate:24,duration:4,camera:startCamera,schedule:{kind:'surface-pointer-orbit-and-reset',peakFrame:43,resetFrame:88},
        invariants:['Actual published camera changes and returns to the recipe camera','Every frame has nonempty rendered mesh owners matching independent default fixture samples','First and last PNGs match'],
        samples,sourceFrameHashMeaning:'SHA-256 of lossless PNG inputs; compressed WebM frames are not claimed pixel-identical'};
    assertSurfaceMotionEvidence(motion);
    return motion;
}

module.exports = Object.freeze({surfaceMotionIds, ownerFixtures, assertOwnerGeometry, assertSurfaceMotionEvidence, surfaceRouteReadyInPage, presentSurface, readPngDimensions, captureSurfaceOrbit});
