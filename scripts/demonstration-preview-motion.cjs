const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const crypto = require('node:crypto');
const {recipes, applyRecipe, applyAction, settle} = require('./demonstration-preview-recipes.cjs');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const motionIds = ['repeated-subdivision','bisection','bezier','affine','elevation','rational-elevation','decasteljau'];
const frameCount = 96;
const sampleRate = 24;
const backgroundPixel = [255, 253, 245];
const affineSteps = [0,1,2,3,2,1,0];
const affineHolds = [18,10,10,20,10,10,18];
const near = (actual, expected, message) => assert.ok(Math.abs(actual-expected)<1e-8, message);

// Shared timing: 12 holds, 71 moving frames (phase 0 to 1), 13 holds. Frames 13..82 move.
const holdStart = 12, moveFrames = 71;
const movePhase = i => Math.max(0, Math.min(1, (i - holdStart) / moveFrames));
// Pointer drags use sin² out and back: 0 at the start, 1 mid-move, 0 at the end.
const sin2OutAndBack = i => Math.sin(Math.PI * movePhase(i)) ** 2;
// Parameter sweeps visit the waypoints in order, each leg with a sin² ease (zero speed at every waypoint).
const sweepWaypoints = [0.5, 1, 0, 0.5];
const sweepStep = 0.01;
const snapToStep = value => Number((Math.round(value / sweepStep) * sweepStep).toFixed(2));
function sweepValue(i) {
    const scaled = movePhase(i) * (sweepWaypoints.length - 1);
    const leg = Math.min(sweepWaypoints.length - 2, Math.floor(scaled));
    const local = scaled - leg;
    const eased = (1 - Math.cos(Math.PI * local)) / 2;
    return snapToStep(sweepWaypoints[leg] + (sweepWaypoints[leg + 1] - sweepWaypoints[leg]) * eased);
}

/** Pure de Casteljau levels for a control polygon at parameter t (level 1 first, the curve point last). */
function deCasteljauLevels(controls, t) {
    let level = controls.map(({x, y}) => ({x, y}));
    const levels = [];
    while (level.length > 1) {
        level = level.slice(0, -1).map((p, i) => ({x: (1 - t) * p.x + t * level[i + 1].x, y: (1 - t) * p.y + t * level[i + 1].y}));
        levels.push(level);
    }
    return levels;
}
/** Independent Bernstein evaluation of the full curve at t, used to check the final construction point. */
function bernsteinPoint(controls, t) {
    const n = controls.length - 1;
    const binomial = (a, b) => { let r = 1; for (let k = 1; k <= b; k++) r = r * (a - b + k) / k; return r; };
    return controls.reduce((acc, p, k) => {
        const b = binomial(n, k) * t ** k * (1 - t) ** (n - k);
        return {x: acc.x + b * p.x, y: acc.y + b * p.y};
    }, {x: 0, y: 0});
}
const pathHash = paths => crypto.createHash('sha256').update(paths.join('\n')).digest('hex');

/** One config row per continuous clip. Bézier stays the pointer-drag reference; decasteljau is a parameter sweep. */
const motionSpecs = {
    bezier: {
        mode: 'pointer-drag', controlCount: 4, handle: 1,
        path: (moved, displacement) => ({x: moved.x + 1.8 * displacement, y: moved.y + 2.1 * displacement}),
        schedule: {kind: 'sin2-out-and-back', phase: 'clamp((frame-12)/71)', displacement: 'sin²(π·phase)',
            zeroDisplacementFrames: '0-12 and 83-95', movingFrames: '13-82', press: 13, release: 83,
            restore: 'coordinate editor (exact)'},
        invariants: ['Only the dragged control point changes position during the drag', 'Other control points stay within 1e-9 of their start',
            'Curve path recomputes from the moved point and returns exactly to the start', 'Stroke widths do not compound across frames'],
    },
    decasteljau: {
        mode: 'parameter-sweep', controlCount: 5,
        control: {label: 'Parameter t', kind: 'range'}, step: sweepStep, start: 0.5,
        // Budget order: no point labels are visible to remove, the full 0-1 range is the lesson, so only the encoder
        // quality changes. Measured on the poster-fit camera: CRF 10 gave 451017 bytes (over the 300 KiB ceiling),
        // CRF 24 gave 353457, CRF 26 323167, CRF 28 295631 (limit 307200).
        crf: 28,
        encoderBudget: 'CRF 28 instead of CRF 10: CRF 10 gave about 451 KB, over the 300 KiB ceiling; no point labels are visible to remove; full 0-1 range kept',
        schedule: {kind: 'piecewise-sin2', waypoints: sweepWaypoints, phase: 'clamp((frame-12)/71)',
            zeroDisplacementFrames: '0-12 and 83-95 (t holds at 0.5)', movingFrames: '13-82',
            legs: 'three equal phase thirds, each eased by (1 - cos πx)/2 from one waypoint to the next', step: sweepStep,
            input: 'keyboard ArrowRight/ArrowLeft on the Parameter t range, incremental from the previous frame'},
        invariants: ['Control points unchanged (1e-9)', 'Intermediate de Casteljau points equal a pure evaluation at the reported t (1e-9)',
            'Final construction point equals the full-curve Bernstein point at t (1e-9)', 'Input value and graph readout equal the snapped target every frame',
            'Partial-curve path changes whenever t changes and is unchanged while t holds', 'Camera fixed: every frame geometry lies inside the poster-fit window',
            'First and last frames equal the recipe state'],
    },
};

function assertPointSet(actual, expected, message) {
    assert.equal(actual.length, expected.length, `${message} (count)`);
    const used = new Set();
    for (const e of expected) {
        const index = actual.findIndex((p, j) => !used.has(j) && Math.abs(p.x - e.x) < 1e-9 && Math.abs(p.y - e.y) < 1e-9);
        assert.ok(index >= 0, `${message}: ${JSON.stringify(e)}`);
        used.add(index);
    }
}

function assertSweepEvidence(motion, spec) {
    assert.equal(motion.samples.length, frameCount, 'Sweep needs one sample per frame');
    const first = motion.samples[0], last = motion.samples[frameCount - 1];
    let previous = null;
    motion.samples.forEach((sample, i) => {
        assert.equal(sample.index, i);assert.equal(sample.time, i / sampleRate);
        const scheduled = sweepValue(i);
        assert.equal(sample.scheduled, scheduled, `Scheduled target differs from the recorded schedule at frame ${i}`);
        assert.ok(Math.abs(sample.actual.input - scheduled) < 1e-9, `Input value differs from target at frame ${i}`);
        assert.equal(sample.actual.readout, `t = ${scheduled.toFixed(2)}`, `Graph readout differs from target at frame ${i}`);
        assert.equal(sample.controls.length, spec.controlCount, 'Wrong control point count');
        first.controls.forEach((p, j) => {
            assert.ok(Math.abs(sample.controls[j].x - p.x) < 1e-9 && Math.abs(sample.controls[j].y - p.y) < 1e-9, `Fixed control point moved at frame ${i}`);
        });
        const controls = sample.controls;
        const levels = deCasteljauLevels(controls, sample.actual.input).flat();
        assertPointSet(sample.points.filter(p => !p.draggable).map(({x, y}) => ({x, y})), levels, `Intermediate point differs from pure de Casteljau at frame ${i}`);
        const final = bernsteinPoint(controls, sample.actual.input);
        assert.ok(Math.abs(levels.at(-1).x - final.x) < 1e-9 && Math.abs(levels.at(-1).y - final.y) < 1e-9, `Final point leaves the full curve at frame ${i}`);
        if (previous) {
            if (previous.scheduled !== scheduled) assert.notEqual(sample.curvePathHash, previous.curvePathHash, `Partial-curve path did not change at frame ${i}`);
            else assert.equal(sample.curvePathHash, previous.curvePathHash, `Partial-curve path changed while t held at frame ${i}`);
        }
        previous = sample;
    });
    assert.equal(last.scheduled, first.scheduled, 'Sweep must end at the recipe parameter');
    assert.equal(last.curvePathHash, first.curvePathHash, 'Last frame path must equal the recipe state');
    assert.equal(last.actual.readout, first.actual.readout, 'Last readout must equal the recipe state');
    last.points.forEach((p, j) => {
        assert.ok(Math.abs(p.x - first.points[j].x) < 1e-9 && Math.abs(p.y - first.points[j].y) < 1e-9, 'Non-seamless loop: last frame differs from first');
    });
}

function assertMotionEvidence(motion) {
    assert.ok(Array.isArray(motion.samples));
    assert.equal(motion.frameCount,frameCount);assert.equal(motion.sampleRate,sampleRate);
    assert.equal(motion.duration,4);
    if(motion.mode==='parameter-sweep') {
        const spec=motionSpecs[motion.id];
        assert.ok(spec && spec.mode==='parameter-sweep','Parameter sweep evidence needs a sweep configuration');
        assertSweepEvidence(motion,spec);
        return;
    }
    if(motion.id==='bezier') {
        assert.equal(motion.samples.length,frameCount);
        const first=motion.samples[0],last=motion.samples[frameCount-1];
        assert.equal(first.points.length,4);
        for(const [i,sample] of motion.samples.entries()) {
            assert.equal(sample.index,i);assert.equal(sample.time,i/24);
            assert.deepEqual(sample.strokeWidths,first.strokeWidths);
            assert.equal(sample.points.length,4);
            first.points.forEach((p,j)=>{
                const actual=sample.points[j];assert.equal(actual.id,p.id);
                const expected=j===1 && i>12 && i<83?sample.target:p;
                const tolerance=j===1 && i>12 && i<83?0.035:1e-9;
                assert.ok(Math.abs(actual.x-expected.x)<tolerance&&Math.abs(actual.y-expected.y)<tolerance,'Invalid Bézier control-point sample');
            });
        }
        assert.notEqual(first.curvePathHash,motion.samples[47].curvePathHash);
        assert.equal(first.curvePathHash,last.curvePathHash,'The original curve must return exactly');
    } else if(['repeated-subdivision','bisection'].includes(motion.id)) {
        assert.equal(motion.samples.length,3);
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,motion.id==='bisection'?i+1:i);
            assert.equal(sample.firstFrame,i*32);assert.equal(sample.holdFrames,32);
            assert.deepEqual(sample.state.box,motion.camera);
            if(motion.id==='bisection')assert.equal(sample.state.readouts.step,String(i+1));
            else assert.equal(sample.state.curves,2**i);
        });
    } else if(motion.id==='affine') {
        assert.equal(motion.samples.length,affineSteps.length);
        const original=motion.samples[0].state.points;
        assert.equal(original.length,4);
        const center=original.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});
        let firstFrame=0;
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,affineSteps[i]);assert.equal(sample.firstFrame,firstFrame);assert.equal(sample.holdFrames,affineHolds[i]);firstFrame+=sample.holdFrames;
            assert.deepEqual(sample.state.box,motion.camera);assert.equal(sample.state.points.length,4);
            const theta=affineSteps[i]*Math.PI/10;
            original.forEach((p,j)=>{
                near(sample.state.points[j].x,center.x+(p.x-center.x)*Math.cos(theta)-(p.y-center.y)*Math.sin(theta),'Incorrect supported affine rotation');
                near(sample.state.points[j].y,center.y+(p.x-center.x)*Math.sin(theta)+(p.y-center.y)*Math.cos(theta),'Incorrect supported affine rotation');
            });
        });
        assert.notDeepEqual(motion.samples[0].state.paths,motion.samples[3].state.paths);
    } else {
        assert.ok(['elevation','rational-elevation'].includes(motion.id));
        assert.equal(motion.samples.length,3);
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,[0,1,0][i]);assert.equal(sample.firstFrame,[0,24,72][i]);assert.equal(sample.holdFrames,[24,48,24][i]);
            assert.deepEqual(sample.state.box,motion.camera);
        });
        assertRepresentation(motion.samples[0].state,motion.samples[1].state,motion.id==='rational-elevation');
        assert.deepEqual(motion.samples[0].state.points.map(({x,y})=>({x,y})),motion.samples[2].state.points.map(({x,y})=>({x,y})));
    }
}

function assertRepresentation(original, elevated, rational) {
    assert.equal(original.points.length,4);assert.equal(elevated.points.length,5);
    const weights=rational?[1,2,1,1]:[1,1,1,1];
    for(let i=0;i<=4;i++) {
        const left=original.points[Math.max(0,i-1)],right=original.points[Math.min(3,i)];
        const a=i===0?0:i/4*weights[i-1],b=i===4?0:(1-i/4)*weights[i];
        for(const key of ['x','y'])near(elevated.points[i][key],(a*left[key]+b*right[key])/(a+b),'Elevation must use the exact homogeneous control-point formula');
    }
    assert.equal(original.curveSamples.length,1);assert.equal(elevated.curveSamples.length,1);
    original.curveSamples[0].forEach((p,i)=>p.forEach((coordinate,j)=>near(elevated.curveSamples[0][i][j],coordinate,'Elevation must preserve the underlying curve')));
}

async function boardSnapshot(page) {
    return page.locator('#jgbox').evaluate(container => {
        const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
        const visible = Object.values(b.objects).filter(o => o.visProp?.visible !== false && o.visProp?.visible !== 'false' && o.rendNode && getComputedStyle(o.rendNode).visibility !== 'hidden' && getComputedStyle(o.rendNode).display !== 'none');
        return {box: b.getBoundingBox(), scale: [b.unitX, b.unitY], curves: visible.filter(o => o.elType === 'curve').length,
            points: visible.filter(o => o.elType === 'point').map(o => ({id: o.id, name: o.name, x: o.X(), y: o.Y(), fixed: o.visProp.fixed, draggable: o.isDraggable === true})),
            paths: visible.filter(o => o.elType === 'curve').map(o => o.rendNode.getAttribute('d')),
            curveSamples: visible.filter(o => o.elType === 'curve').map(o => Array.from({length:21},(_,i)=>[o.X(i/20),o.Y(i/20)])),
            strokeWidths: visible.filter(o => ['curve','line'].includes(o.elType)).map(o => getComputedStyle(o.rendNode).strokeWidth),
            readouts: Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.dataset.readout, e.querySelector('dd')?.textContent]))};
    });
}

async function screenshotBoard(page, file) {
    const clip = await page.locator('#jgbox').evaluate(e => {const r = e.getBoundingClientRect(); return {x:r.left,y:r.top,width:e.clientWidth,height:e.clientHeight};});
    await page.screenshot({path: file, clip, animations:'disabled', caret:'hide', scale:'device'});
    return {file:path.basename(file), sha256:digest(file), width: clip.width * 2, height:clip.height * 2};
}

async function openRoute(browser, demonstration, baseUrl) {
    const context = await browser.newContext({viewport:{width:1440,height:850},deviceScaleFactor:2,locale:'sl-SI',colorScheme:'light',reducedMotion:'reduce',timezoneId:'Europe/Ljubljana'});
    await context.addInitScript(() => {localStorage.clear(); sessionStorage.clear();});
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(baseUrl + demonstration.path.slice('/bezeg-2.0'.length));
    await page.waitForFunction(() => document.querySelector('#jgbox svg') && window.JXG && Object.values(window.JXG.boards).some(b => b.container === 'jgbox' && Object.values(b.objects).some(o => o.elType === 'curve')));
    await settle(page);
    return {page,context};
}

function encode(framesDirectory, output, fps = 24, crf = 10) {
    const ffmpeg = process.env.PREVIEW_FFMPEG || 'ffmpeg';
    const ffprobe = process.env.PREVIEW_FFPROBE || 'ffprobe';
    const inputPattern = path.join(framesDirectory,'%03d.png');
    const settings = ['-y','-loglevel','error','-framerate',String(fps),'-i',inputPattern,'-an','-c:v','libvpx-vp9','-crf',String(crf),'-b:v','0','-pix_fmt','gbrp','-colorspace','rgb','-color_primaries','bt709','-color_trc','iec61966-2-1','-color_range','pc','-row-mt','1',output];
    execFileSync(ffmpeg,settings,{timeout:120000});
    const probe = JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
    const video = probe.streams.find(s => s.codec_type === 'video');
    assert.equal(video.width,720); assert.equal(video.height,440);
    assert.equal(video.pix_fmt,'gbrp','Preserve RGB channels in VP9');
    assert.equal(video.color_range,'pc');
    assert.equal(video.color_space,'gbr');
    assert.equal(video.color_primaries,'bt709');
    assert.equal(video.color_transfer,'iec61966-2-1');
    assert.equal(probe.streams.length,1,'Motion must be silent');
    const duration = Number(probe.format.duration);
    assert.ok(duration >= 2 && duration <= 4);
    const bytes = fs.statSync(output).size;
    assert.ok(bytes <= 300*1024,`Motion over 300KiB: ${bytes}`);
    // Decode one real background pixel from every input and output frame. This runs at
    // the encoder seam so metadata alone cannot make a color-fidelity regression pass.
    const sourcePixels = execFileSync(ffmpeg,['-v','error','-framerate',String(fps),'-i',inputPattern,'-vf','crop=1:1:0:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{timeout:120000});
    const decodedPixels = execFileSync(ffmpeg,['-v','error','-i',output,'-vf','crop=1:1:0:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{timeout:120000});
    assert.equal(sourcePixels.length,frameCount*3,'Expected one source background pixel for every frame');
    assert.equal(decodedPixels.length,sourcePixels.length,'Decoded background sample count changed');
    for(let i=0;i<sourcePixels.length;i+=3) {
        assert.deepEqual([...decodedPixels.subarray(i,i+3)],backgroundPixel,`Decoded background changed at frame ${i/3}`);
        assert.deepEqual([...sourcePixels.subarray(i,i+3)],backgroundPixel,`Source background changed at frame ${i/3}`);
    }
    return {file:path.basename(output),sha256:digest(output),type:'video/webm',duration,bytes,width:video.width,height:video.height,codec:video.codec_name,
        pixelFormat:video.pix_fmt,colorRange:video.color_range,colorSpace:video.color_space,colorPrimaries:video.color_primaries,colorTransfer:video.color_transfer,
        backgroundPixel:{rgb:backgroundPixel,checked:'upper-left pixel of every source and decoded frame'},
        encoder:execFileSync(ffmpeg,['-version'],{encoding:'utf8'}).split(/\r?\n/)[0], arguments:settings};
}

async function captureHold(page,d,window,presentBoard,directory,firstFrame,holdFrames) {
    const scene=await presentBoard(page.locator('#jgbox'),d,recipes[d.id],{window});
    const state=await boardSnapshot(page);
    assert.ok(Math.abs(state.scale[0]-state.scale[1])<1e-8 || d.id==='bisection','Geometric motion must preserve equal unit scales');
    const captured=await screenshotBoard(page,path.join(directory,String(firstFrame).padStart(3,'0')+'.png'));
    for(let hold=1;hold<holdFrames;hold++)fs.copyFileSync(path.join(directory,captured.file),path.join(directory,String(firstFrame+hold).padStart(3,'0')+'.png'));
    return {firstFrame,holdFrames,capture:captured,state,camera:scene.boundingBox};
}

/** Pointer drag: press the handle once, follow the scheduled path, release, then restore the exact start through the coordinate editor. */
async function captureDrag(browser, d, spec, directory, baseUrl, presentBoard) {
    const window=recipes[d.id].framing.window;
    const sampleEvidence=[];
    const {page,context}=await openRoute(browser,d,baseUrl);
    try {
        await applyRecipe(page,recipes[d.id]);
        await presentBoard(page.locator('#jgbox'),d,recipes[d.id],{window});
        const initial=await boardSnapshot(page); const fixedBox=initial.box;
        const points=initial.points.filter(p=>p.draggable);
        assert.equal(points.length,spec.controlCount,`Expected the original ${spec.controlCount} draggable control points`);
        const moved=points[spec.handle];
        const screen=async(x,y)=>page.locator('#jgbox').evaluate((e,{x,y})=>{const b=Object.values(window.JXG.boards).find(b=>b.container==='jgbox');const r=e.getBoundingClientRect();return {x:r.left+b.origin.scrCoords[1]+b.unitX*x,y:r.top+b.origin.scrCoords[2]-b.unitY*y};},{x,y});
        const start=await screen(moved.x,moved.y);
        for(let i=0;i<frameCount;i++) {
            const phase=movePhase(i);const displacement=sin2OutAndBack(i);
            const target=spec.path(moved,displacement);
            if(i===spec.schedule.press){await page.mouse.move(start.x,start.y);await page.mouse.down();}
            if(i>spec.schedule.press-1 && i<spec.schedule.release){const at=await screen(target.x,target.y);await page.mouse.move(at.x,at.y);}
            if(i===spec.schedule.release){
                await page.mouse.up();
                await applyAction(page,{kind:'button',label:'Krivulja1'});
                await page.locator('.point-coordinate-editor summary').click();
                await page.getByLabel('p1 x',{exact:true}).fill(String(moved.x));
                await page.getByLabel('p1 y',{exact:true}).fill(String(moved.y));
                await page.getByRole('button',{name:'Uporabi koordinate',exact:true}).click();
                await applyAction(page,{kind:'button',label:'Prekliči izbiro'});
            }
            await settle(page);
            if(process.env.PREVIEW_SAMPLE_DELAY_MS)await page.waitForTimeout(Number(process.env.PREVIEW_SAMPLE_DELAY_MS));
            await presentBoard(page.locator('#jgbox'),d,recipes[d.id],{window});
            const state=await boardSnapshot(page);
            assert.deepEqual(state.box,fixedBox);
            assert.deepEqual(state.strokeWidths,initial.strokeWidths,'Capture presentation compounded stroke widths');
            for(const original of points) {
                const actual=state.points.find(p=>p.id===original.id);assert.ok(actual);
                const expected=original.id===moved.id?target:original;
                const tolerance=original.id===moved.id && i>12 && i<83?0.035:1e-9;
                assert.ok(Math.abs(actual.x-expected.x)<tolerance&&Math.abs(actual.y-expected.y)<tolerance,`Unexpected control-point position at sample ${i}: ${JSON.stringify({actual,expected})}`);
            }
            if(i===47)assert.notDeepEqual(state.paths,initial.paths,'Pointer motion did not recompute the real curve');
            const captured=await screenshotBoard(page,path.join(directory,String(i).padStart(3,'0')+'.png'));
            const actualMoved=state.points.find(p=>p.id===moved.id);
            sampleEvidence.push({index:i,time:i/24,phase,target,scheduled:target,
                actual:{id:moved.id,x:actualMoved.x,y:actualMoved.y},
                fixed:state.points.filter(p=>p.id!==moved.id&&points.some(q=>q.id===p.id)).map(({id,x,y})=>({id,x,y})),
                capture:captured,points:state.points,strokeWidths:state.strokeWidths,curvePathHash:pathHash(state.paths)});
        }
        await page.mouse.up();
        return {camera:fixedBox,samples:sampleEvidence};
    } finally {await context.close();}
}

/** Parameter sweep: keyboard-step the range input along the schedule, asserting input, readout and construction every frame. */
async function captureSweep(browser, d, spec, directory, baseUrl, presentBoard) {
    const recipe=recipes[d.id];
    const sampleEvidence=[];
    const {page,context}=await openRoute(browser,d,baseUrl);
    try {
        await applyRecipe(page,recipe);
        // The poster's own fit is the camera for every frame. Presenting once keeps frame 0 identical to the poster
        // framing; re-presenting with a coordinate window changes the fit, so no per-frame refit is applied.
        const poster=await presentBoard(page.locator('#jgbox'),d,recipe,{});
        const initial=await boardSnapshot(page);const fixedBox=initial.box;
        assert.deepEqual(fixedBox,poster.boundingBox,'Poster fit must be the sweep camera');
        const controls0=initial.points.filter(p=>p.draggable);
        assert.equal(controls0.length,spec.controlCount,`Expected ${spec.controlCount} draggable control points`);
        // The range is inside the animation panel behind the inspector tabs; reveal it as applyAction does.
        let control=page.getByLabel(spec.control.label,{exact:true});
        assert.equal(await control.count(),1,`Unsupported or ambiguous range control: ${spec.control.label}`);
        for(const tab of ['Prikaz','Uredi']){if(await control.isVisible())break;await page.getByRole('button',{name:tab,exact:true}).click();}
        const rangeId=await control.getAttribute('id');
        const range=page.locator(`[id=${JSON.stringify(rangeId)}]`);
        const readout=()=>page.evaluate(()=>document.querySelector('.decasteljau-animation-heading output')?.textContent??null);
        let previousValue=Number(await range.inputValue());
        assert.ok(Math.abs(previousValue-spec.start)<1e-9 && await readout()===`t = ${spec.start.toFixed(2)}`,'Sweep must start at the recipe parameter');
        let previous=null;
        for(let i=0;i<frameCount;i++) {
            const target=sweepValue(i);
            const steps=Math.round((target-previousValue)/spec.step);
            if(steps) {
                await range.focus();
                for(let k=0;k<Math.abs(steps);k++)await range.press(steps>0?'ArrowRight':'ArrowLeft');
            }
            await settle(page);
            const value=Number(await range.inputValue());
            const shown=await readout();
            assert.ok(Math.abs(value-target)<1e-9,`Input ${value} differs from scheduled ${target} at frame ${i}`);
            assert.equal(shown,`t = ${target.toFixed(2)}`,`Graph readout differs from scheduled ${target} at frame ${i}`);
            const state=await boardSnapshot(page);
            assert.deepEqual(state.box,fixedBox,'Camera changed between sweep frames');
            assert.deepEqual(state.strokeWidths,initial.strokeWidths,'Capture presentation compounded stroke widths');
            const controls=state.points.filter(p=>p.draggable);
            assert.equal(controls.length,spec.controlCount,'Control point count changed');
            controls.forEach((p,j)=>{assert.equal(p.id,controls0[j].id);assert.ok(Math.abs(p.x-controls0[j].x)<1e-9&&Math.abs(p.y-controls0[j].y)<1e-9,`Control point ${p.id} moved at frame ${i}`);});
            const intermediate=state.points.filter(p=>!p.draggable).map(({x,y})=>({x,y}));
            assertPointSet(intermediate,deCasteljauLevels(controls,value).flat(),`Intermediate point differs from pure de Casteljau at frame ${i}`);
            const final=bernsteinPoint(controls,value);
            const curveEnd=deCasteljauLevels(controls,value).flat().at(-1);
            assert.ok(Math.abs(curveEnd.x-final.x)<1e-9&&Math.abs(curveEnd.y-final.y)<1e-9,`Final point leaves the full curve at frame ${i}`);
            for(const p of state.points)assert.ok(p.x>=fixedBox[0]&&p.x<=fixedBox[2]&&p.y<=fixedBox[1]&&p.y>=fixedBox[3],`Point ${p.id} left the fixed camera at frame ${i}`);
            const hash=pathHash(state.paths);
            if(previous){
                if(previous.target!==target)assert.notEqual(hash,previous.curvePathHash,`Partial-curve path did not change at frame ${i}`);
                else assert.equal(hash,previous.curvePathHash,`Partial-curve path changed while t held at frame ${i}`);
            }
            const captured=await screenshotBoard(page,path.join(directory,String(i).padStart(3,'0')+'.png'));
            sampleEvidence.push({index:i,time:i/24,target,scheduled:target,
                actual:{input:value,readout:shown,steps},
                controls:controls.map(({id,x,y})=>({id,x,y})),
                fixed:controls.map(({id,x,y})=>({id,x,y})),
                capture:captured,points:state.points.map(({id,name,x,y,draggable})=>({id,name,x,y,draggable})),
                strokeWidths:state.strokeWidths,curvePathHash:hash});
            previous={target,curvePathHash:hash};
            previousValue=value;
        }
        return {camera:fixedBox,samples:sampleEvidence};
    } finally {await context.close();}
}

async function generateMotions(browser, demonstrations, output, baseUrl, presentBoard, selectedIds=motionIds) {
    assert.ok(selectedIds.length && selectedIds.every(id=>motionIds.includes(id)) && new Set(selectedIds).size===selectedIds.length,'Unknown or duplicate motion diagnostic ID');
    const motions=[];
    for (const id of selectedIds) {
        const started=Date.now();
        const d=demonstrations.find(d=>d.id===id);
        const directory=path.join(output,'frames-'+id); fs.mkdirSync(directory,{recursive:true});
        const spec=motionSpecs[id];
        let fixedBox;
        let sampleEvidence=[];
        const record=sample=>{fixedBox ||=sample.state.box;assert.deepEqual(sample.state.box,fixedBox,'Camera changed between exact checkpoints');sampleEvidence.push(sample);};
        if (['repeated-subdivision','bisection'].includes(id)) {
            for(let checkpoint=0;checkpoint<3;checkpoint++) {
                const {page,context}=await openRoute(browser,d,baseUrl);
                try {
                    const steps=id==='bisection'?checkpoint+1:checkpoint;
                    if(steps)await applyAction(page,{kind:'button',label:id==='bisection'?'Naslednji korak':'Subdiviziraj',count:steps});
                    const sample=await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,checkpoint*32,32);
                    if(id==='repeated-subdivision')assert.equal(sample.state.curves,2**steps);
                    else assert.equal(sample.state.readouts.step,String(steps));
                    record({checkpoint:steps,...sample});
                }finally{await context.close();}
            }
        } else if(id==='affine') {
            const {page,context}=await openRoute(browser,d,baseUrl);
            try {
                await applyRecipe(page,recipes[id]);
                let firstFrame=0;
                for(let i=0;i<affineSteps.length;i++) {
                    const actions=[];
                    if(i){const action={kind:'button',label:i<=3?'Rotiraj desno: 18°':'Rotiraj levo: 18°'};await applyAction(page,action);actions.push(action);}
                    record({checkpoint:affineSteps[i],actions,...await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,firstFrame,affineHolds[i])});
                    firstFrame+=affineHolds[i];
                }
            }finally{await context.close();}
        } else if(['elevation','rational-elevation'].includes(id)) {
            for(let checkpoint=0;checkpoint<3;checkpoint++) {
                const {page,context}=await openRoute(browser,d,baseUrl);
                try {
                    await applyRecipe(page,recipes[id]);
                    const actions=[];
                    if(checkpoint===1) {
                        const action={kind:'button',label:id==='elevation'?'↑Dvigni stopnjo':'Dvigni stopnjo'};await applyAction(page,action);actions.push(action);
                        // Elevation replaces the control points; refresh existing weight labels with current indices.
                        if(id==='rational-elevation')for(const action of [{kind:'button',label:'Krivulja1'},{kind:'toggle',label:'Uteži',value:false},{kind:'toggle',label:'Uteži',value:true},{kind:'button',label:'Prekliči izbiro'}]){await applyAction(page,action);actions.push(action);}
                    }
                    await page.mouse.move(10,10);
                    record({checkpoint:checkpoint===1?1:0,actions,...await captureHold(page,d,recipes[id].framing.window,presentBoard,directory,[0,24,72][checkpoint],[24,48,24][checkpoint])});
                }finally{await context.close();}
            }
        } else {
            const result=spec.mode==='pointer-drag'
                ? await captureDrag(browser,d,spec,directory,baseUrl,presentBoard)
                : await captureSweep(browser,d,spec,directory,baseUrl,presentBoard);
            fixedBox=result.camera;sampleEvidence=result.samples;
        }
        const encoded=encode(directory,path.join(output,id+'.webm'),sampleRate,spec?.crf);
        const mode=spec?.mode ?? (id==='affine'?'supported-rotation-steps':id.endsWith('elevation')?'exact-degree-elevation':'discrete-exact-steps');
        motions.push({id,...encoded,frameCount,sampleRate,camera:fixedBox,mode,
            ...(spec?{schedule:spec.schedule,invariants:spec.invariants,encoderBudget:spec.encoderBudget}:{}),
            samples:sampleEvidence,sourceFrameHashMeaning:'SHA-256 of lossless PNG inputs; compressed WebM frames are not claimed pixel-identical',generationSeconds:(Date.now()-started)/1000});
        assertMotionEvidence(motions.at(-1));
        console.log(`Encoded ${id}: ${encoded.bytes} bytes, ${encoded.duration}s`);
    }
    return motions;
}

module.exports={generateMotions,boardSnapshot,screenshotBoard,openRoute,encode,assertMotionEvidence,motionIds,motionSpecs,sweepValue,deCasteljauLevels,bernsteinPoint,sin2OutAndBack,movePhase};
