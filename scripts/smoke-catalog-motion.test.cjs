const test=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../tests/smoke-catalog.cjs');

test('motion camera provenance validates surface orbit cameras and keeps board cameras',()=>{
    const surface={view:'surface'};
    const camera={az:-0.9,el:0.5,distance:8.2,target:[0,0,1.25]};
    const capture={framing:{kind:'surface-view',camera}};
    assert.doesNotThrow(()=>catalog.assertMotionPosterCamera(surface,capture,{id:'patch-tensor',mode:'surface-orbit',camera:structuredClone(camera)}));
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
