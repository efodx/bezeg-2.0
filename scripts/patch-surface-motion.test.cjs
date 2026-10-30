'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {surfaceMotionIds, ownerFixtures, assertSurfaceMotionEvidence, surfaceRouteReadyInPage, readPngDimensions} = require('./patch-surface-motion.cjs');
const {capture, testSupport} = require('./demonstration-preview-motion.cjs');

function fixture(id = 'patch-tensor') {
    const camera = {az:-0.9,el:0.5,distance:8.167849250854438,target:[0,0,1.25]};
    return {id,mode:'surface-orbit',frameCount:96,samples:Array.from({length:96},(_,index)=>({index,
        capture:{sha256:index===0||index===95?'recipe':`frame-${index}`},
        observed:{camera:{...camera,az:index===43?camera.az+0.25:camera.az},renderedOwners:ownerFixtures[id].map(owner=>({
            ...owner,geometrySamples:owner.geometrySamples.map(point=>[...point]),
        }))},
    }))};
}

test('surface orbit IDs are runner-selectable and exported through the capture API',()=>{
    assert.deepEqual(capture.surfaceMotionIds,surfaceMotionIds);
    for(const id of surfaceMotionIds) assert.ok(capture.motionIds.includes(id),`${id} is selectable`);
});

test('triangular motion pins the shipped cubic dome rather than a unit reference triangle',()=>{
    const {expectedSamples} = require('./patch-guided-example-expectations.cjs');
    const net = [];
    for (let i = 3; i >= 0; i--) for (let j = 3 - i; j >= 0; j--) {
        const k = 3 - i - j;
        net.push({x: (-1.5 * i + 1.5 * j) / 3, y: (-1.3 * i - 1.3 * j + 1.3 * k) / 3,
            z: 3 - Math.max(i, j, k)});
    }
    assert.deepEqual(ownerFixtures['patch-triangular'][0].geometrySamples,
        expectedSamples({kind: 'triangular', n: 3, net}, 16));
});

test('surface route readiness needs a drawn SVG surface view and published owner evidence',async()=>{
    let readiness;
    const page={setDefaultTimeout(){},goto:async()=>{},waitForFunction:async fn=>{readiness=fn;},evaluate:async()=>{}};
    const context={addInitScript:async()=>{},newPage:async()=>page};
    await testSupport.openRoute({newContext:async()=>context},{id:'patch-tensor',view:'surface',path:'/bezeg-2.0/patches'},'http://localhost/bezeg-2.0');
    const owner={id:'tensor-patch-0',kind:'tensor',geometrySamples:[[0,0,0]]};
    const shape={getAttribute:name=>name==='points'?'1,2 3,4 5,6':null};
    const svg={getBoundingClientRect:()=>({width:360,height:220}),querySelectorAll:()=>[shape]};
    const host={getAttribute:name=>name==='data-surface-framing'?JSON.stringify({width:360,height:220,camera:{az:0.2,el:0.4}}):name==='data-rendered-surface-owners'?JSON.stringify([owner]):null,
        querySelector:selector=>selector==='[data-jsx-surface-view] svg'?svg:null};
    const previous=globalThis.document;
    globalThis.document={querySelector:selector=>selector==='#jgbox'?host:null};
    try {
        assert.equal(readiness,surfaceRouteReadyInPage);
        assert.equal(surfaceRouteReadyInPage(),true,'A drawn SVG surface with rendered owners is ready');
        const restore=host.getAttribute;
        host.getAttribute=name=>name==='data-surface-framing'?JSON.stringify({width:360,height:220,camera:{az:0.2,el:0.4}}):'[]';
        assert.equal(surfaceRouteReadyInPage(),false,'An empty owner list is not ready');
        host.getAttribute=restore;
        shape.getAttribute=name=>name==='points'?'':null;
        assert.equal(surfaceRouteReadyInPage(),false,'An SVG with no drawn points is not ready');
        shape.getAttribute=name=>name==='points'?'1,2 3,4':name==='display'?'none':null;
        assert.equal(surfaceRouteReadyInPage(),false,'An SVG whose drawables are all hidden is not ready');
        shape.getAttribute=name=>name==='points'?'1,2 3,4':null;
        svg.getBoundingClientRect=()=>({width:0,height:220});
        assert.equal(surfaceRouteReadyInPage(),false,'A zero-size SVG is not ready');
        host.querySelector=()=>null;
        assert.equal(surfaceRouteReadyInPage(),false,'A missing surface view is not ready');
    } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('surface frame dimensions come from each PNG IHDR',()=>{
    const file=require('node:path').join(require('node:os').tmpdir(),`patch-motion-${process.pid}.png`);
    const header=Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a','hex').copy(header,0);
    header.writeUInt32BE(13,8);header.write('IHDR',12,'ascii');header.writeUInt32BE(720,16);header.writeUInt32BE(440,20);
    require('node:fs').writeFileSync(file,header);
    try {assert.deepEqual(readPngDimensions(file),{width:720,height:440});}
    finally {require('node:fs').unlinkSync(file);}
});

test('surface motion evidence requires actual camera motion, return, and rendered default geometry',()=>{
    assert.equal(assertSurfaceMotionEvidence(fixture()),true);
    const noMotion=fixture();
    noMotion.samples[43].observed.camera.az=noMotion.samples[0].observed.camera.az;
    assert.throws(()=>assertSurfaceMotionEvidence(noMotion),/camera never moved/);
    const noReturn=fixture();
    noReturn.samples[95].observed.camera.az+=0.1;
    assert.throws(()=>assertSurfaceMotionEvidence(noReturn),/did not return/);
    const empty=fixture();
    empty.samples[20].observed.renderedOwners=[];
    assert.throws(()=>assertSurfaceMotionEvidence(empty),/rendered surface owners are empty/);
    const wrongOwner=fixture();
    wrongOwner.samples[20].observed.renderedOwners[0].id='wrong-owner';
    assert.throws(()=>assertSurfaceMotionEvidence(wrongOwner),/missing rendered owner/);
    const wrongGeometry=fixture();
    wrongGeometry.samples[20].observed.renderedOwners[0].geometrySamples[0][2]+=0.1;
    assert.throws(()=>assertSurfaceMotionEvidence(wrongGeometry),/differs from default fixture/);
});
