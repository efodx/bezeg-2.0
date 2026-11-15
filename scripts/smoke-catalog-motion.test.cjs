const test=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../tests/smoke-catalog.cjs');

test('motion camera provenance validates surface orbit cameras and keeps board cameras',()=>{
    const surface={view:'surface'};
    const camera={az:-0.9,el:0.5,distance:8.2,target:[0,0,1.25]};
    const capture={framing:{kind:'surface-view',camera}};
    assert.doesNotThrow(()=>catalog.assertMotionPosterCamera(surface,capture,{id:'patch-tensor',mode:'surface-orbit',camera:structuredClone(camera)}));
    // A held-camera parameter sweep of a surface row (solids) holds exactly the poster camera, like a held-camera drag.
    const held={id:'patch-tensor',mode:'parameter-sweep',row:{id:'patch-tensor'},cameraHeld:true,camera:structuredClone(camera)};
    assert.doesNotThrow(()=>catalog.assertMotionPosterCamera(surface,capture,held));
    for(const invalid of [{...held,cameraHeld:false},{...held,row:undefined},{...held,camera:{...camera,az:camera.az+1e-12}}]) assert.throws(()=>catalog.assertMotionPosterCamera(surface,capture,invalid),/Surface poster and clip cameras differ/);
    for(const invalid of [
        {id:'patch-tensor',mode:'pointer-drag',camera},
        {id:'patch-tensor',mode:'surface-orbit',camera:{...camera,target:[0,0]}},
        {id:'patch-tensor',mode:'surface-orbit',camera:{...camera,target:[0,0,1.26]}},
        {id:'patch-tensor',mode:'surface-orbit',camera:{...camera,extra:true}},
    ]) assert.throws(()=>catalog.assertMotionPosterCamera(surface,capture,invalid),/Surface poster and clip cameras differ/);

    const board={view:'board'},boardCamera=[-1,2,3,-4];
    const boardCapture={framing:{boardBoundingBox:boardCamera}};
    assert.doesNotThrow(()=>catalog.assertMotionPosterCamera(board,boardCapture,{id:'bezier',camera:[...boardCamera]}));
    assert.throws(()=>catalog.assertMotionPosterCamera(board,boardCapture,{id:'bezier',mode:'surface-orbit',camera:boardCamera}),/Poster and clip cameras differ/);
    assert.throws(()=>catalog.assertMotionPosterCamera(board,boardCapture,{id:'bezier',camera:[-1,2,4,-4]}),/Poster and clip cameras differ/);
});
