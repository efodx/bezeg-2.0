const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {recipes,validateRecipes,applyAction,assertOutcomeEvidence}=require('./demonstration-preview-recipes.cjs');
const {assertMotionEvidence,encode,sweepValue,deCasteljauLevels,bernsteinPoint,motionSpecs,weightedParameterizationMarkers,complexCaptionLines,accumulationReadoutLine}=require('./demonstration-preview-motion.cjs').testSupport;
const {publishValidatedSet}=require('./publish-demonstration-previews.cjs');
const {mergeRecapturedMotions,alignMotionCameras,serializeManifest}=require('./capture-demonstration-previews.cjs');

test('compact evidence preserves numeric observations and retained records without repeated new SVG strings',()=>{
    const sample={capture:{sha256:'hash'},curvePathHash:'path-hash',observed:{curves:[{d:'large-svg-path',samples:[{x:1/3,y:-2}],min:0,max:1}]}};
    const manifest={version:2,motions:[{id:'old',samples:[sample]},{id:'new',samples:[sample]}]};
    const parsed=JSON.parse(serializeManifest(manifest,['new']));
    assert.deepEqual(parsed.motions[0],manifest.motions[0]);
    assert.deepEqual(parsed.motions[1].samples[0].observed.curves[0],{samples:[{x:1/3,y:-2}],min:0,max:1});
    assert.equal(parsed.motions[1].samples[0].curvePathHash,'path-hash');
    assert.equal(manifest.motions[1].samples[0].observed.curves[0].d,'large-svg-path');
});

test('camera provenance canonicalizes only numerical roundoff and rejects a real camera change',()=>{
    const camera=[-1,2,3,-4],captures=[{id:'test',framing:{boardBoundingBox:camera}}];
    const exact={id:'test',camera:[...camera]},retained=exact.camera;
    alignMotionCameras(captures,[exact]);
    assert.equal(exact.camera,retained);
    const rounded={id:'test',camera:[-1+1e-14,2,3,-4]};
    alignMotionCameras(captures,[rounded]);
    assert.deepEqual(rounded.camera,camera);
    assert.throws(()=>alignMotionCameras(captures,[{id:'test',camera:[-1.001,2,3,-4]}]),/cameras differ/);
    assert.throws(()=>alignMotionCameras(captures,[{id:'test',camera:[NaN,2,3,-4]}]),/cameras differ/);
});
test('surface outcome evidence requires a drawn SVG surface view',()=>{
    const camera={az:-0.9,el:0.5,distance:8.2,target:[0,0,1.25]};
    const base={view:'surface',surfaceView:'board2d',svg:{width:360,height:220},drawables:12,readouts:{},controls:[],camera,controlPointCount:recipes["patch-tensor"].framing.controlPointCount??16};
    assert.doesNotThrow(()=>assertOutcomeEvidence('patch-tensor',base));
    const {surfaceView:_view,svg:_svg,drawables:_drawables,...legacy}=base;
    for(const bad of [{...legacy},{...legacy,contextType:'webgl2'},{...base,drawables:0},{...base,svg:{width:0,height:220}},{...base,surfaceView:'canvas'}]){
        assert.throws(()=>assertOutcomeEvidence('patch-tensor',bad),/not drawn by the JSXGraph SVG surface view/);
    }
});
test('surface camera provenance validates orbit cameras while retaining board cameras',()=>{
    const camera={az:-0.9,el:0.5,distance:8.2,target:[0,0,1.25]};
    const poster={id:'patch-tensor',framing:{kind:'surface-view',camera}};
    const exact={id:'patch-tensor',mode:'surface-orbit',camera:structuredClone(camera)};
    alignMotionCameras([poster],[exact]);
    assert.deepEqual(exact.camera,camera);
    const rounded={id:'patch-tensor',mode:'surface-orbit',camera:{...camera,az:camera.az+1e-14,target:[...camera.target]}};
    alignMotionCameras([poster],[rounded]);
    assert.deepEqual(rounded.camera,camera);
    for (const invalid of [
        {id:'patch-tensor',mode:'surface-orbit',camera:{...camera,target:[0,0]}},
        {id:'patch-tensor',mode:'surface-orbit',camera:{...camera,target:[0,0,1.26]}},
        {id:'patch-tensor',mode:'pointer-drag',camera},
        {id:'patch-tensor',mode:'surface-orbit',camera:{...camera,extra:true}},
    ]) assert.throws(()=>alignMotionCameras([poster],[invalid]),/cameras differ/);

    const board=[-1,2,3,-4],boardPoster={id:'test',framing:{boardBoundingBox:board}};
    const retained={id:'test',camera:[...board]};
    alignMotionCameras([boardPoster],[retained]);
    assert.deepEqual(retained.camera,board);
    assert.throws(()=>alignMotionCameras([boardPoster],[{id:'test',camera:[-1,2,4,-4]}]),/cameras differ/);
});
const catalog=require('../tests/smoke-catalog.cjs');

test('registry exhaustively matches the live catalog and rejects missing/unknown recipes',()=>{
    validateRecipes(catalog);
    const missing={...recipes};delete missing.bernstein;
    assert.throws(()=>validateRecipes(catalog,missing),/exhaustively/);
    assert.throws(()=>validateRecipes(catalog,{...recipes,unknown:{}}),/exhaustively/);
    assert.throws(()=>validateRecipes(catalog,{...recipes,bezier:{...recipes.bezier,actions:[{kind:'bridge'}]}}),/Unsupported/);
});
test('unsupported controls fail instead of silently capturing a default',async()=>{
    await assert.rejects(applyAction({getByRole:()=>({count:async()=>0})},{kind:'button',label:'missing'}),/Unsupported/);
});

test('number actions distinguish a rounded input draft from a full-precision graph value',async()=>{
    let shown='3,1416';
    const control={count:async()=>1,isVisible:async()=>true,getAttribute:async()=>null,fill:async()=>{},press:async()=>{},inputValue:async()=>shown};
    const page={getByLabel:()=>({nth:()=>control}),evaluate:async()=>{}};
    await applyAction(page,{kind:'number',label:'Točka x',value:Math.PI,displayDecimals:4});
    await assert.rejects(applyAction(page,{kind:'number',label:'Točka x',value:Math.PI}));
    shown='3,1415';
    await assert.rejects(applyAction(page,{kind:'number',label:'Točka x',value:Math.PI,displayDecimals:4}));
});
test('semantic assertions reject empty, wrong-degree, missing-Farin and unrevealed evidence',()=>{
    assert.throws(()=>assertOutcomeEvidence('bernstein',{}),/semantic/);
    const evidence={curves:2,points:[],readouts:{},reveals:{},controls:[]};
    assert.throws(()=>assertOutcomeEvidence('bernstein',evidence),/four/);
    assert.throws(()=>assertOutcomeEvidence('repeated-subdivision',evidence),/original curve/);
    assert.throws(()=>assertOutcomeEvidence('farin',evidence));
    assert.throws(()=>assertOutcomeEvidence('extrema',evidence),/reveal/);
    assert.throws(()=>assertOutcomeEvidence('bisection',evidence),/First/);
});
test('step provenance requires exact consecutive states and the common camera',()=>{
    const camera=[-1,2,3,-2];
    const spec=motionSpecs['repeated-subdivision'];
    const P=[{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:1,y:0}];
    let firstFrame=0;
    const motion={id:'repeated-subdivision',frameCount:96,sampleRate:24,duration:4,camera,schedule:spec.schedule,invariants:spec.invariants,
        samples:spec.checkpoints.map((c,i)=>{
            const curves=2**c.value;
            const result={checkpoint:c.value,phase:c.phase,actions:c.actions,firstFrame,holdFrames:spec.holds[i],capture:{sha256:c.value===0?'poster':'refined'},
                state:{box:[...camera],curves,points:P.map(p=>({...p,draggable:true})),curveSamples:Array.from({length:curves},(_,piece)=>Array.from({length:21},(_,j)=>{
                    const p=bernsteinPoint(P,(piece+j/20)/curves);return [p.x,p.y];
                }))}};
            firstFrame+=spec.holds[i];return result;
        })};
    assertMotionEvidence(motion);
    motion.samples[1].state.curves=3;assert.throws(()=>assertMotionEvidence(motion));
    motion.samples[1].state.curves=2;motion.samples[2].state.box[0]=-2;assert.throws(()=>assertMotionEvidence(motion));
});
test('smooth evidence rejects stroke compounding, stationary-point drift and a failed exact return',()=>{
    const base=[{id:'p0',x:-4,y:-3,draggable:true},{id:'p1',x:-3,y:2,draggable:true},{id:'p2',x:2,y:2,draggable:true},{id:'p3',x:3,y:-2,draggable:true}];
    const motion={id:'bezier',mode:'pointer-drag',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>{
        const shift=Math.sin(Math.PI*Math.max(0,Math.min(1,(i-12)/71)))**2;
        const target={x:-3+1.25*shift,y:2+1.5*shift};
        return {index:i,time:i/24,target,points:base.map((p,j)=>({...p,...(j===1&&i>12&&i<83?target:{})})),strokeWidths:['2.24px'],curvePathHash:i<=12||i>=83?'original':'moved'};
    })};
    assertMotionEvidence(motion);
    motion.samples[35].strokeWidths=['200px'];assert.throws(()=>assertMotionEvidence(motion));
    motion.samples[35].strokeWidths=['2.24px'];motion.samples[35].points[2].x+=0.1;assert.throws(()=>assertMotionEvidence(motion));
    motion.samples[35].points[2].x-=0.1;motion.samples[95].points[1].x+=0.01;assert.throws(()=>assertMotionEvidence(motion));
});
test('elevation provenance rejects an inexact rational control point or changed underlying curve',()=>{
    const camera=[-5,4.3,5,-3.5];
    const original={box:camera,points:[[-4,-3],[-3,3],[3,3],[4,-3]].map(([x,y])=>({x,y})),curveSamples:[[[0,1],[1,2]]]};
    const elevated={box:camera,points:[[-4,-3],[-22/7,15/7],[-1,3],[3.25,1.5],[4,-3]].map(([x,y])=>({x,y})),curveSamples:structuredClone(original.curveSamples)};
    const motion={id:'rational-elevation',frameCount:96,sampleRate:24,duration:4,camera,samples:[original,elevated,structuredClone(original)].map((state,i)=>({checkpoint:[0,1,0][i],firstFrame:[0,24,72][i],holdFrames:[24,48,24][i],state}))};
    assertMotionEvidence(motion);
    elevated.points[1].x+=0.1;assert.throws(()=>assertMotionEvidence(motion),/homogeneous/);
    elevated.points[1].x-=0.1;elevated.curveSamples[0][1][1]+=0.1;assert.throws(()=>assertMotionEvidence(motion),/preserve/);
});
test('affine provenance rejects a wrong intermediate rotation and shifted camera',()=>{
    const camera=[-4,4,4,-4],original=[[-3,2],[0,-2],[1,2],[3,-2]];
    const steps=[0,1,2,3,2,1,0],holds=[18,10,10,20,10,10,18];let firstFrame=0;
    const motion={id:'affine',frameCount:96,sampleRate:24,duration:4,camera,samples:steps.map((step,i)=>{
        const theta=step*Math.PI/10;
        const sample={checkpoint:step,firstFrame,holdFrames:holds[i],state:{box:[...camera],paths:[String(step)],points:original.map(([x,y])=>({x:0.25+(x-0.25)*Math.cos(theta)-y*Math.sin(theta),y:(x-0.25)*Math.sin(theta)+y*Math.cos(theta)}))}};
        firstFrame+=holds[i];return sample;
    })};
    assertMotionEvidence(motion);
    motion.samples[3].state.points[1].x+=0.1;assert.throws(()=>assertMotionEvidence(motion),/rotation/);
    motion.samples[3].state.points[1].x-=0.1;motion.samples[4].state.box[0]-=0.5;assert.throws(()=>assertMotionEvidence(motion));
});
test('parameter sweep provenance rejects a moved fixed point, wrong intermediate, a jump at the loop seam and a target mismatch',()=>{
    const controls=[{id:'c0',x:-4,y:-3},{id:'c1',x:-3,y:2},{id:'c2',x:0,y:3},{id:'c3',x:3,y:2},{id:'c4',x:4,y:-3}];
    const sample=i=>{
        const scheduled=sweepValue(i,motionSpecs.decasteljau);
        const levels=deCasteljauLevels(controls,scheduled).flat();
        const points=[...controls.map(p=>({...p,draggable:true})),...levels.map((p,j)=>({id:'i'+j,name:'',x:p.x,y:p.y,draggable:false}))];
        return {index:i,time:i/24,scheduled,actual:{input:scheduled,readout:`t = ${scheduled.toFixed(2)}`,steps:0},
            controls:controls.map(({id,x,y})=>({id,x,y})),points,curvePathHash:`path-${scheduled}`,capture:{sha256:'recipe-png'}};
    };
    const motion=()=>({id:'decasteljau',mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,0.5);assert.equal(valid.samples[95].scheduled,0.5);
    assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),1);assert.equal(Math.min(...valid.samples.map(s=>s.scheduled)),0);
    const moved=motion();moved.samples[40].controls[2].x+=0.1;
    assert.throws(()=>assertMotionEvidence(moved),/Fixed control point moved/);
    const wrong=motion();wrong.samples[40].points[7].x+=0.1;
    assert.throws(()=>assertMotionEvidence(wrong),/Intermediate point differs/);
    // The construction end is the last of the 10 intermediate points (after the 5 controls): moving it off the curve must fail the Bernstein check.
    const off=motion();off.samples[40].points[14].x+=0.1;
    assert.throws(()=>assertMotionEvidence(off),/Final point leaves the full curve/);
    const seam=motion();seam.samples[95].curvePathHash='path-jump';
    assert.throws(()=>assertMotionEvidence(seam),/changed while t held|Last frame|Non-seamless/);
    const seamPng=motion();seamPng.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seamPng),/Non-seamless loop: last PNG/);
    const mismatch=motion();mismatch.samples[40].actual.input+=0.01;
    assert.throws(()=>assertMotionEvidence(mismatch),/Input value differs/);
    const readout=motion();readout.samples[40].actual.readout='t = 0.40';
    assert.throws(()=>assertMotionEvidence(readout),/readout differs/);
    const stalled=motion();stalled.samples[30].curvePathHash=stalled.samples[29].curvePathHash;
    assert.throws(()=>assertMotionEvidence(stalled),/did not change/);
});
test('decasteljau-alternative sweep: A, B, C and the connecting segment match pure evaluations at the reported t, with the seam checked',()=>{
    const controls=[{x:-4,y:-3},{x:-3,y:2},{x:0,y:3},{x:3,y:2},{x:4,y:-3}];
    const spec=motionSpecs['decasteljau-alternative'];
    const sample=i=>{
        const t=sweepValue(i,spec);
        const A=bernsteinPoint(controls.slice(0,4),t),B=bernsteinPoint(controls.slice(1),t),C=bernsteinPoint(controls,t);
        const points=[...controls.map((p,j)=>({id:'c'+j,name:'$$p_{'+j+'}$$',x:p.x,y:p.y,draggable:true})),
            ...[A,B,C].map((p,j)=>({id:'i'+j,name:'',x:p.x,y:p.y,draggable:false}))];
        return {index:i,time:i/24,scheduled:t,actual:{input:t,readout:spec.sweep.readout.text(t),steps:0},
            controls:controls.map((p,j)=>({id:'c'+j,...p})),points,
            observed:{segment:{p1:A,p2:B}},curvePathHash:'path-'+t,pathCount:3,capture:{sha256:'recipe-png'}};
    };
    const motion=()=>({id:'decasteljau-alternative',mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,0.5);assert.equal(valid.samples[95].scheduled,0.5);
    assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),1);assert.equal(Math.min(...valid.samples.map(s=>s.scheduled)),0);
    const moved=motion();moved.samples[40].controls[2].x+=0.1;
    assert.throws(()=>assertMotionEvidence(moved),/Fixed control point moved/);
    // A extra or displaced non-draggable point breaks the exact {A, B, C} set.
    const extra=motion();extra.samples[40].points.push({id:'x',name:'',x:0,y:0,draggable:false});
    assert.throws(()=>assertMotionEvidence(extra),/Non-draggable points differ/);
    const wrongA=motion();wrongA.samples[40].points[5].x+=0.1;
    assert.throws(()=>assertMotionEvidence(wrongA),/Non-draggable points differ/);
    // The segment drawn from a wrong B (for example the cubic of p0..p3 instead of p1..p4 at t).
    const segB=motion();segB.samples[40].observed.segment.p2.y+=0.05;
    assert.throws(()=>assertMotionEvidence(segB),/Segment end differs from B/);
    // A segment whose endpoints are both correct but whose C is moved: the point-set check fails.
    const curveOff=motion();const s40=curveOff.samples[40];
    s40.points[7]={...s40.points[7],x:s40.points[7].x+0.01};
    assert.throws(()=>assertMotionEvidence(curveOff),/Non-draggable points differ/);
    const stalled=motion();stalled.samples[30].curvePathHash=stalled.samples[29].curvePathHash;
    assert.throws(()=>assertMotionEvidence(stalled),/did not change/);
    const held=motion();held.samples[60].curvePathHash='changed-while-held';
    assert.throws(()=>assertMotionEvidence(held),/changed while t held/);
    const seamPng=motion();seamPng.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seamPng),/Non-seamless loop: last PNG/);
    const mismatch=motion();mismatch.samples[40].actual.input+=0.01;
    assert.throws(()=>assertMotionEvidence(mismatch),/Input value differs/);
    const noPath=motion();noPath.samples.forEach(s=>{s.pathCount=0;});
    assert.throws(()=>assertMotionEvidence(noPath),/Curve paths missing/);
});
test('derivative sweep provenance rejects a moved x0, a wrong secant slope, a moved tangent, a non-seamless end, a non-identical end PNG and the excluded band',()=>{
    const deriv=motionSpecs.derivative,f=x=>x*x,x0=1;
    const sample=i=>{
        const h=sweepValue(i,deriv),q=x0+h,slope=(f(q)-f(x0))/h,intercept=f(x0)-slope*x0;
        return {index:i,time:i/24,scheduled:h,actual:{input:h,readout:deriv.sweep.readout.text(h),steps:0},
            controls:[{id:'p',x:x0,y:f(x0)}],
            points:[{id:'p',name:'$$P$$',x:x0,y:f(x0),draggable:true},{id:'q',name:'$$Q$$',x:q,y:f(q),draggable:false}],
            observed:{P:{x:x0,y:f(x0)},Q:{x:q,y:f(q)},secant:{stdform:[intercept,slope,-1]},tangent:{slope:2,intercept:-1}},
            curvePathHash:'function-and-tangent',pathCount:1,capture:{sha256:'recipe-png'}};
    };
    const motion=()=>({id:'derivative',mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,1);assert.equal(valid.samples[95].scheduled,1);
    assert.equal(Math.min(...valid.samples.map(s=>s.scheduled)),0.05);assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),1);
    assert.ok(valid.samples.every(s=>Math.abs(s.scheduled)>=0.01&&s.scheduled>=-2&&s.scheduled<=2));
    const moved=motion();moved.samples[40].controls[0].x+=0.1;moved.samples[40].observed.P.x+=0.1;
    assert.throws(()=>assertMotionEvidence(moved),/Fixed control point moved/);
    const wrongSlope=motion();wrongSlope.samples[40].observed.secant.stdform[1]+=0.1;
    assert.throws(()=>assertMotionEvidence(wrongSlope),/Secant slope differs/);
    const tangent=motion();tangent.samples[40].observed.tangent.intercept+=0.1;
    assert.throws(()=>assertMotionEvidence(tangent),/Tangent moved/);
    const path=motion();path.samples[40].curvePathHash='changed';
    assert.throws(()=>assertMotionEvidence(path),/Function or tangent path changed/);
    const seam=motion();seam.samples[95].points[1].x+=0.01;
    assert.throws(()=>assertMotionEvidence(seam),/Non-seamless/);
    const png=motion();png.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(png),/PNG differs/);
    const band=sample(40);band.actual.input=0.005;
    assert.throws(()=>deriv.sweep.check(band,null,valid.samples[0],deriv),/excluded band/);
    // Finding 1: the tangent must pass through P. y = 2x has slope 2 = f'(1) but misses P=(1, 1) (2 * 1 + 0 - 1 = 1, not 0).
    const line=motion();line.samples.forEach(s=>{s.observed.tangent={slope:2,intercept:0};});
    assert.throws(()=>assertMotionEvidence(line),/Tangent does not pass through P/);
    // Finding 3: an empty snapshot hashes the same every frame, so the function path must be present.
    const empty=motion();empty.samples.forEach(s=>{s.pathCount=0;});
    assert.throws(()=>assertMotionEvidence(empty),/Function path missing/);
});
test('Farin pointer-drag provenance rejects a moved control point, a changed non-dragged ratio, a weight text mismatch and a non-seamless end',()=>{
    const {rationalPoint,farinEffectiveWeights,farinWeightText,farinValue,farinPoint,farinParameterTs,sin2OutAndBack}=require('./demonstration-preview-motion.cjs').testSupport;
    const controls=[{id:'p0',x:-4,y:-3},{id:'p1',x:-3,y:3},{id:'p2',x:3,y:3},{id:'p3',x:4,y:-3}];
    const edges=[[controls[0],controls[1]],[controls[1],controls[2]],[controls[2],controls[3]]];
    const sample=i=>{
        const v=farinValue(1/3,sin2OutAndBack(i));
        const values=[2/3,v,0.5];
        const sliders=values.map((value,j)=>({v:value,p1:{...edges[j][0]},p2:{...edges[j][1]}}));
        const weights=farinEffectiveWeights(values);
        return {index:i,time:i/24,scheduled:{v},target:farinPoint(sliders[1],v),
            points:controls.map(p=>({...p,draggable:true})),
            observed:{sliders,weights:weights.map((w,k)=>farinWeightText(k,w)),
                curve:farinParameterTs.map(t=>rationalPoint(controls,weights,t))},
            curvePathHash:`path-${v}`,capture:{sha256:'recipe-png'}};
    };
    const motion=()=>({id:'farin',mode:'pointer-drag',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled.v,1/3);assert.equal(valid.samples[95].scheduled.v,1/3);
    assert.ok(Math.abs(Math.max(...valid.samples.map(s=>s.scheduled.v))-motionSpecs.farin.glider.target)<1e-3);
    const moved=motion();moved.samples[40].points[1].x+=0.1;
    assert.throws(()=>assertMotionEvidence(moved),/Control point moved/);
    const ratio=motion();ratio.samples[40].observed.sliders[2].v+=0.01;
    assert.throws(()=>assertMotionEvidence(ratio),/Non-dragged ratio changed/);
    const text=motion();text.samples[40].observed.weights[2]='$$w_{2}=9.00$$';
    assert.throws(()=>assertMotionEvidence(text),/Weight text differs/);
    const off=motion();off.samples[40].observed.sliders[1].v+=0.01;
    assert.throws(()=>assertMotionEvidence(off),/off its scheduled ratio/);
    const seam=motion();seam.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seam),/Non-seamless loop: last PNG/);
    const stalled=motion();stalled.samples[30].curvePathHash=stalled.samples[29].curvePathHash;
    assert.throws(()=>assertMotionEvidence(stalled),/did not change/);
});
test('weighted-parameterization sweep: markers equal B(phi_alpha(t_k)) at the reported alpha, with a fixed curve path',()=>{
    const spec=motionSpecs['weighted-parameterization'];
    const controls=[{x:-4,y:-3},{x:-3,y:2},{x:2,y:2},{x:3,y:-2}];
    const sample=i=>{
        const alpha=sweepValue(i,spec),readout=spec.sweep.readout.text(alpha);
        const markers=weightedParameterizationMarkers(controls,Number(readout.replace(',','.')),spec.sweep.markerCount);
        return {index:i,time:i/24,scheduled:alpha,actual:{input:alpha,readout,steps:0},
            controls:controls.map((p,j)=>({id:'c'+j,...p})),
            points:[...controls.map((p,j)=>({id:'c'+j,name:'$$P$$',x:p.x,y:p.y,draggable:true})),...markers.map((p,k)=>({id:'m'+k,x:p.x,y:p.y,draggable:false}))],
            curvePathHash:'bezier-path',pathCount:1,capture:{sha256:'recipe-png'}};
    };
    const motion=()=>({id:'weighted-parameterization',mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,0.25);assert.equal(valid.samples[95].scheduled,0.25);
    assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),0.75);
    // phi_alpha(t) is the identity at alpha = 1/2 and maps 0 and 1 to themselves.
    assert.ok(Math.abs(weightedParameterizationMarkers(controls,0.5,10)[4].x-bernsteinPoint(controls,5/11).x)<1e-12);
    const off=motion();off.samples[40].points[4].x+=1e-6;
    assert.throws(()=>assertMotionEvidence(off),/Parameter marker differs/);
    const path=motion();path.samples[40].curvePathHash='changed';
    assert.throws(()=>assertMotionEvidence(path),/Curve path changed/);
    const empty=motion();empty.samples.forEach(s=>{s.pathCount=0;});
    assert.throws(()=>assertMotionEvidence(empty),/Curve path missing/);
    const seam=motion();seam.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seam),/Non-seamless loop: last PNG/);
});
// PH offset fixtures: the offset is built as B + d·(D_y, -D_x)/|D| (the right normal of the independent Bernstein derivative).
// The board curves are listed offset first, PH second, so the PH identification by evaluation is exercised.
const phFixtureMotion=(id,controls)=>{
    const {bernsteinDerivativePoint,bernsteinPoint}=require('./demonstration-preview-motion.cjs').testSupport;
    const spec=motionSpecs[id];
    const sample=i=>{
        const d=sweepValue(i,spec),readout=spec.sweep.readout.text(d);
        const ph=Array.from({length:41},(_,k)=>bernsteinPoint(controls,k/40));
        const offsets=[1,2,3].map(multiplier=>Array.from({length:41},(_,k)=>{
            const B=ph[k],D=bernsteinDerivativePoint(controls,k/40),n=Math.hypot(D.x,D.y),distance=multiplier*d;
            return {x:B.x+distance*D.y/n,y:B.y-distance*D.x/n};
        }));
        return {index:i,time:i/24,scheduled:d,actual:{input:d,readout,steps:0},controls:[],
            points:controls.map((p,j)=>({id:'c'+j,name:'$$p_{'+j+'}$$',x:p.x,y:p.y,draggable:false})),
            observed:{curves:[...offsets.map((samples,j)=>({min:0,max:1,d:`offset-${j+1}-${d}`,visible:true,samples})),{min:0,max:1,d:'ph-path',visible:true,samples:ph}]},
            curvePathHash:'paths-'+d,pathCount:4,capture:{sha256:'recipe-png'}};
    };
    return ()=>({id,mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
};
// Rotate the offset point of one parameter by theta about the PH point: the distance stays |d| but the offset leaves the normal.
const rotateOffset=(sample,k,theta)=>{
    const {bernsteinPoint}=require('./demonstration-preview-motion.cjs').testSupport;
    const o=sample.observed.curves[0].samples[k];
    const B=bernsteinPoint(sample.points.map(({x,y})=>({x,y})),k/40);
    const vx=o.x-B.x,vy=o.y-B.y;
    o.x=B.x+Math.cos(theta)*vx-Math.sin(theta)*vy;o.y=B.y+Math.sin(theta)*vx+Math.cos(theta)*vy;
};
const phCubicControls=[{x:-4.2,y:-2},{x:-1.08,y:1.9667},{x:2.9167,y:1.4567},{x:4.2067,y:-1.49}];
test('ph-cubic sweep: three visible offsets track d, 2d, 3d on one side; the PH curve stays fixed and the seam matches',()=>{
    const {phOffsetWaypoints}=require('./demonstration-preview-motion.cjs').testSupport;
    const spec=motionSpecs['ph-cubic'];
    const motion=phFixtureMotion('ph-cubic',phCubicControls);
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,0.35);assert.equal(valid.samples[95].scheduled,0.35);
    assert.equal(Math.min(...valid.samples.map(s=>s.scheduled)),-0.35);assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),0.35);
    assert.deepEqual(phOffsetWaypoints(phCubicControls,0.35),[0.35,-0.35,0.35]);
    assert.deepEqual(spec.sweep.waypoints,[0.35,-0.35,0.35]);
    const distance=motion();distance.samples[40].observed.curves[2].samples[10].x+=1e-3;
    assert.throws(()=>assertMotionEvidence(distance),/Offset 3 distance differs/);
    const perp=motion();rotateOffset(perp.samples[40],10,0.01);
    assert.throws(()=>assertMotionEvidence(perp),/not perpendicular/);
    const side=motion();const s=side.samples[40].observed.curves[0].samples[10],B=bernsteinPoint(phCubicControls,0.25);
    // Mirror the offset point through the PH point: distance and perpendicularity hold, the side flips.
    s.x=2*B.x-s.x;s.y=2*B.y-s.y;
    assert.throws(()=>assertMotionEvidence(side),/Offset 1 side differs/);
    const phPath=motion();phPath.samples[40].observed.curves[3].d='changed';
    assert.throws(()=>assertMotionEvidence(phPath),/PH curve path changed/);
    const phMoved=motion();phMoved.samples[40].observed.curves[3].samples[8].y+=0.01;
    assert.throws(()=>assertMotionEvidence(phMoved),/PH curve differs from its Bezier/);
    const count=motion();count.samples[40].observed.curves.pop();
    assert.throws(()=>assertMotionEvidence(count),/Expected one PH curve and three offset curves/);
    const hidden=motion();hidden.samples[40].observed.curves[2].visible=false;
    assert.throws(()=>assertMotionEvidence(hidden),/not rendered visibly/);
    const stalled=motion();stalled.samples[30].observed.curves[0].d=stalled.samples[29].observed.curves[0].d;
    assert.throws(()=>assertMotionEvidence(stalled),/Offset path did not change/);
    const held=motion();held.samples[90].observed.curves[0].d='changed-while-held';
    assert.throws(()=>assertMotionEvidence(held),/Offset path changed while d held/);
    const moved=motion();moved.samples[40].points[2].x+=0.1;
    assert.throws(()=>assertMotionEvidence(moved),/Control point moved/);
    const mismatch=motion();mismatch.samples[40].actual.input+=0.01;
    assert.throws(()=>assertMotionEvidence(mismatch),/Input value differs from target/);
    const readoutOff=motion();readoutOff.samples[40].actual.readout='0,36';
    assert.throws(()=>assertMotionEvidence(readoutOff),/Graph readout differs from target/);
    const seam=motion();seam.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seam),/Non-seamless loop: last PNG/);
    const noPath=motion();noPath.samples.forEach(x=>{x.pathCount=0;});
    assert.throws(()=>assertMotionEvidence(noPath),/Curve paths missing/);
});
const phQuinticControls=[{x:1,y:-1},{x:3.178,y:-1},{x:3.046,y:1.64},{x:0.478,y:2.1306666666666665},{x:-2.002,y:0.4026666666666663},{x:-3.25,y:-2.1573333333333338}];
test('ph-quintic sweep: three signed-normal offsets stay cusp-free and keep their fixed quintic curve',()=>{
    const {phOffsetRadii,phOffsetWaypoints}=require('./demonstration-preview-motion.cjs').testSupport;
    const spec=motionSpecs['ph-quintic'],motion=phFixtureMotion('ph-quintic',phQuinticControls),valid=motion();
    assertMotionEvidence(valid);
    assert.deepEqual(spec.sweep.waypoints,[0.15,-0.15,0.15]);
    assert.deepEqual(phOffsetWaypoints(phQuinticControls,0.15),[0.15,-0.15,0.15]);
    assert.ok(phOffsetRadii(phQuinticControls).negative>0.675,'The cusp margin must exceed 1.5× the outermost recipe distance');
    assert.equal(valid.samples[0].scheduled,0.15);assert.equal(valid.samples[95].scheduled,0.15);
    assert.ok(Math.max(...valid.samples.map(s=>Math.abs(s.scheduled)))>0.14);
    const {phOffsetSweepCheck,bernsteinPoint}=require('./demonstration-preview-motion.cjs').testSupport;
    const unsafe=valid.samples[0],base=bernsteinPoint(phQuinticControls,0);
    unsafe.scheduled=-0.3;unsafe.actual.input=-0.3;unsafe.actual.readout='−0,30';
    unsafe.observed.curves.slice(0,3).forEach(curve=>curve.samples.forEach(point=>{
        point.x=base.x-2*(point.x-base.x);point.y=base.y-2*(point.y-base.y);
    }));
    assert.throws(()=>phOffsetSweepCheck(unsafe,null,unsafe,spec),/3\|d\| = .* is not below the radius/);
});
const subdivisionControls=[{x:-4,y:-3},{x:-3,y:3},{x:3,y:3},{x:4,y:-3}];
const subdivisionFixture=()=>{
    const spec=motionSpecs.subdivision,camera=[-5,5,5,-4];
    const controls=subdivisionControls.map((p,j)=>({id:'c'+j,...p,draggable:true})),levels=deCasteljauLevels(controls,.5).flat();
    let firstFrame=0;
    return {id:'subdivision',mode:spec.mode,frameCount:96,sampleRate:24,duration:4,camera,schedule:spec.schedule,invariants:spec.invariants,
        samples:spec.checkpoints.map((c,i)=>{
            const result={checkpoint:c.value,phase:c.phase,actions:c.actions,firstFrame,holdFrames:spec.holds[i],capture:{sha256:c.value?'split':'poster'},
                state:{box:camera,points:[...controls,...(c.value?levels:[])]},observed:{segments:[[controls[0],...deCasteljauLevels(controls,.5).map(l=>l[0])],[...deCasteljauLevels(controls,.5).map(l=>l.at(-1)).reverse(),controls.at(-1)]].flatMap(child=>child.slice(1).map((p,i)=>[child[i],p])),curves:[0,1].map(half=>({samples:Array.from({length:21},(_,j)=>bernsteinPoint(controls,(half+j/20)/2))}))}};
            firstFrame+=spec.holds[i];return result;
        })};
};
test('exact subdivision holds both child representations on the unchanged parent and resets to its poster',()=>{
    assertMotionEvidence(subdivisionFixture());
    const missing=subdivisionFixture();missing.samples[1].state.points=missing.samples[1].state.points.slice(0,4);
    assert.throws(()=>assertMotionEvidence(missing),/Child control polygon missing/);
    const wrong=subdivisionFixture();wrong.samples[1].observed.curves[1].samples[10].y+=.01;
    assert.throws(()=>assertMotionEvidence(wrong),/reconstruct/);
    const phase=subdivisionFixture();phase.samples[2].phase='discovery';assert.throws(()=>assertMotionEvidence(phase),/phase/);
    const seam=subdivisionFixture();seam.samples[2].capture.sha256='different';assert.throws(()=>assertMotionEvidence(seam),/recipe PNG/);
});
test('selective motion recapture replaces only selected clips and keeps the other evidence in order',()=>{
    const old=[{id:'first',sha256:'keep-1',samples:[1]},{id:'second',sha256:'old-2',samples:[2]},{id:'third',sha256:'keep-3',samples:[3]}];
    const replacement={id:'second',sha256:'new-2',samples:[22]};
    assert.deepEqual(mergeRecapturedMotions(old,[replacement],['second']),[old[0],replacement,old[2]]);
    assert.deepEqual(mergeRecapturedMotions(old,[{id:'fourth',sha256:'new-4'}],['fourth']),[...old,{id:'fourth',sha256:'new-4'}]);
});
/** A stepped fixture: checkpoints, holds and the camera come from steppedClips; readouts, actions and PNG hashes are supplied per checkpoint. */
function steppedFixture(id, readoutsFor, actionsFor) {
    const {steppedClips}=require('./demonstration-preview-motion.cjs').testSupport;
    const stepped=steppedClips[id], camera=[-0.3,4.8,2.4,-0.5];
    let firstFrame=0;
    const samples=stepped.checkpoints.map((checkpoint,i)=>{
        const sample={checkpoint,firstFrame,holdFrames:stepped.holds[i],actions:actionsFor(checkpoint),capture:{sha256:'seam-png'},state:{box:[...camera],readouts:readoutsFor(checkpoint)}};
        firstFrame+=stepped.holds[i];return sample;
    });
    return {id,mode:'discrete-exact-steps',frameCount:96,sampleRate:24,duration:4,camera,samples};
}
const darbouxButtons=n=>Array.from({length:Math.round(Math.log2(n/4))},()=>({kind:'button',label:'Zgosti razdelitev (n → 2n)'}));
const integralRange=n=>[{kind:'range',label:'Število podintervalov n',value:n}];

test('darboux reference sums: x² on [0, 2] gives the recipe readouts and agrees with closed forms at every checkpoint',()=>{
    const {darbouxReferenceSums,leftRiemannReference,darbouxReadoutExpectation,integralReadoutExpectation}=require('./demonstration-preview-motion.cjs').testSupport;
    assert.deepEqual(darbouxReadoutExpectation(4),{n:'4',a:'0',b:'2',lower:'1,75',upper:'3,75',integral:'2,6667',gap:'2'});
    assert.deepEqual(integralReadoutExpectation(6),{n:'6',a:'0',b:'2',h:'0,3333',sum:'2,037',exact:'2,6667',difference:'−0,6296'});
    const f=x=>x*x;
    for(const n of [4,8,16,32,48]) {
        const h=2/n, {lower,upper}=darbouxReferenceSums(f,0,2,n);
        // Closed forms for the left and right endpoint sums of x²: lower = h³·(n−1)n(2n−1)/6, upper = h³·n(n+1)(2n+1)/6.
        assert.ok(Math.abs(lower-h**3*(n-1)*n*(2*n-1)/6)<1e-9,`lower sum at n=${n}`);
        assert.ok(Math.abs(upper-h**3*n*(n+1)*(2*n+1)/6)<1e-9,`upper sum at n=${n}`);
        assert.ok(Math.abs(leftRiemannReference(f,0,2,n)-lower)<1e-9,`left Riemann equals lower for increasing x² at n=${n}`);
    }
});

test('darboux stepped clip: readouts equal the pure sums at each checkpoint, press counts, camera and seam are enforced',()=>{
    const {assertMotionEvidence,darbouxReadoutExpectation}=require('./demonstration-preview-motion.cjs').testSupport;
    const make=()=>steppedFixture('darboux',darbouxReadoutExpectation,darbouxButtons);
    assertMotionEvidence(make());
    const wrongSum=make();wrongSum.samples[1].state.readouts.lower='2,1876';assert.throws(()=>assertMotionEvidence(wrongSum),/lower/);
    const wrongUpper=make();wrongUpper.samples[2].state.readouts.upper='3,75';assert.throws(()=>assertMotionEvidence(wrongUpper),/upper/);
    const wrongN=make();wrongN.samples[3].state.readouts.n='16';assert.throws(()=>assertMotionEvidence(wrongN),/n differs/);
    const wrongPresses=make();wrongPresses.samples[1].actions=[];assert.throws(()=>assertMotionEvidence(wrongPresses),/presses/);
    const wrongHold=make();wrongHold.samples[3].holdFrames=19;assert.throws(()=>assertMotionEvidence(wrongHold),/hold/);
    const wrongSequence=make();wrongSequence.samples[4].checkpoint=8;assert.throws(()=>assertMotionEvidence(wrongSequence),/checkpoint 4/);
    const seam=make();seam.samples.at(-1).capture.sha256='other-png';assert.throws(()=>assertMotionEvidence(seam),/seam/);
    const moved=make();moved.samples[4].state.box[1]=5;assert.throws(()=>assertMotionEvidence(moved),/Camera changed/);
});

test('definite-integral stepped clip: readouts equal the left sum, h, exact and sum − exact at each checkpoint; range, holds and seam are enforced',()=>{
    const {assertMotionEvidence,integralReadoutExpectation}=require('./demonstration-preview-motion.cjs').testSupport;
    const make=()=>steppedFixture('definite-integral',integralReadoutExpectation,integralRange);
    assertMotionEvidence(make());
    const wrongSum=make();wrongSum.samples[1].state.readouts.sum='2,038';assert.throws(()=>assertMotionEvidence(wrongSum),/sum/);
    const wrongSign=make();wrongSign.samples[2].state.readouts.difference='0,6296';assert.throws(()=>assertMotionEvidence(wrongSign),/difference/);
    const wrongN=make();wrongN.samples[3].state.readouts.n='50';assert.throws(()=>assertMotionEvidence(wrongN),/n differs/);
    const wrongRange=make();wrongRange.samples[2].actions=[{kind:'range',label:'Število podintervalov n',value:11}];assert.throws(()=>assertMotionEvidence(wrongRange),/range/);
    const wrongHolds=make();wrongHolds.samples[0].holdFrames=17;assert.throws(()=>assertMotionEvidence(wrongHolds),/hold/);
    const seam=make();seam.samples.at(-1).capture.sha256='other-png';assert.throws(()=>assertMotionEvidence(seam),/seam/);
});

test('real VP9 encoding retains exact RGB background samples and declares its color metadata',t=>{
    const ffmpeg=process.env.PREVIEW_FFMPEG||'ffmpeg',ffprobe=process.env.PREVIEW_FFPROBE||'ffprobe';
    try {execFileSync(ffmpeg,['-version'],{stdio:'ignore'});execFileSync(ffprobe,['-version'],{stdio:'ignore'});}
    catch {t.skip('requires FFmpeg and FFprobe to exercise the real encoder seam');return;}
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bezeg-preview-rgb-'));
    try {
        const frames=path.join(directory,'frames');fs.mkdirSync(frames);
        const fixture=path.resolve(__dirname,'../src/images/demonstrations/catalog/bezier.png');
        for(let i=0;i<96;i++)fs.copyFileSync(fixture,path.join(frames,String(i).padStart(3,'0')+'.png'));
        const result=encode(frames,path.join(directory,'rgb.webm'));
        assert.equal(result.pixelFormat,'gbrp');assert.equal(result.colorRange,'pc');assert.equal(result.colorSpace,'gbr');
        assert.equal(result.colorPrimaries,'bt709');assert.equal(result.colorTransfer,'iec61966-2-1');
        assert.deepEqual(result.backgroundPixel,{rgb:[255,253,245],checked:'upper-left pixel of every source and decoded frame'});
        assert.ok(result.bytes<=300*1024);
    } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('validation or partial-run failure preserves the complete published set and maps',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bezeg-preview-test-'));
    try {
        const staging=path.join(directory,'stage'),destination=path.join(directory,'published');fs.mkdirSync(staging);fs.mkdirSync(destination);
        fs.writeFileSync(path.join(staging,'one.png'),'new');fs.writeFileSync(path.join(destination,'one.png'),'old');
        const map=path.join(directory,'map.ts');fs.writeFileSync(map,'old-map');
        assert.throws(()=>publishValidatedSet({staging,destination,files:['one.png'],maps:[[path.join(staging,'missing-map'),map]],validate:()=>{throw new Error('partial capture');}}),/partial capture/);
        assert.equal(fs.readFileSync(path.join(destination,'one.png'),'utf8'),'old');assert.equal(fs.readFileSync(map,'utf8'),'old-map');
        assert.throws(()=>publishValidatedSet({staging,destination,files:['one.png'],maps:[[path.join(staging,'missing-map'),map]],validate:()=>{}}));
        assert.equal(fs.readFileSync(path.join(destination,'one.png'),'utf8'),'old');assert.equal(fs.readFileSync(map,'utf8'),'old-map');
    }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('pruning failure also restores prior published bytes and obsolete files',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bezeg-preview-prune-'));
    const unlink=fs.unlinkSync;
    try {
        const staging=path.join(directory,'stage'),destination=path.join(directory,'published');fs.mkdirSync(staging);fs.mkdirSync(destination);
        fs.writeFileSync(path.join(staging,'one.png'),'new');fs.writeFileSync(path.join(destination,'one.png'),'old');
        const obsolete=path.join(destination,'obsolete.png');fs.writeFileSync(obsolete,'old-obsolete');
        fs.unlinkSync=file=>{if(file===obsolete)throw new Error('simulated locked obsolete asset');return unlink(file);};
        assert.throws(()=>publishValidatedSet({staging,destination,files:['one.png'],maps:[],validate:()=>{}}),/locked obsolete/);
        assert.equal(fs.readFileSync(path.join(destination,'one.png'),'utf8'),'old');assert.equal(fs.readFileSync(obsolete,'utf8'),'old-obsolete');
    }finally{fs.unlinkSync=unlink;fs.rmSync(directory,{recursive:true,force:true});}
});

// complex-multiplication: synthetic evidence in the shape captureDrag records (targets, board points, caption text).
const complexFixture=(overrides={})=>{
    const spec=motionSpecs['complex-multiplication'];
    const snap=value=>Math.round(value*20)/20+0;
    const z={x:1,y:0.5};
    const frames=Array.from({length:96},(_,i)=>{
        const target=overrides[i]?.target??spec.path(null,spec.progress(i));
        const zi=overrides[i]?.z??z;
        const w={x:snap(target.x),y:snap(target.y)};
        const product={x:zi.x*w.x-zi.y*w.y+(overrides[i]?.productError??0),y:zi.x*w.y+zi.y*w.x};
        const caption=complexCaptionLines(zi,w,{x:zi.x*w.x-zi.y*w.y,y:zi.x*w.y+zi.y*w.x}).join('\n');
        return {index:i,time:i/24,target,capture:{sha256:'recipe-frame'},
            points:[{id:'z',name:'$$z$$',x:zi.x,y:zi.y,draggable:true},{id:'w',name:'$$w$$',x:w.x,y:w.y,draggable:true},
                {id:'zw',name:'$$zw$$',x:product.x,y:product.y,draggable:false}],
            observed:{text:caption}};
    });
    return {id:'complex-multiplication',mode:'pointer-drag',frameCount:96,sampleRate:24,duration:4,samples:frames};
};
test('complex multiplication: snapped w, z·w product, caption and exact return pass on consistent evidence',()=>{
    assertMotionEvidence(complexFixture());
});
test('complex multiplication rejects a product off by 1e-6, a moved z and a final w other than i',()=>{
    assert.throws(()=>assertMotionEvidence(complexFixture({40:{productError:1e-6}})),/differs from z·w/);
    assert.throws(()=>assertMotionEvidence(complexFixture({40:{z:{x:1.05,y:0.5}}})),/z moved/);
    assert.throws(()=>assertMotionEvidence(complexFixture({95:{target:{x:1,y:0}}})),/differs from the starting i/);
});
test('accumulation reference integral agrees with the antiderivative on both signed stretches',()=>{
    const {accumulationReference,accumulationReadoutLine}=require('./demonstration-preview-motion.cjs').testSupport;
    for(const a of [-.5,0,1])for(const x of [-1,0,2,Math.PI,4])assert.ok(Math.abs(accumulationReference(a,x)-(Math.cos(a)-Math.cos(x)))<1e-10);
    assert.match(accumulationReadoutLine(0,Math.PI),/A\(x\) = 2/);
});
test('path counts ignore curves without path data, so an empty snapshot cannot pass the path-present checks',()=>{
    const {countPaths}=require('./demonstration-preview-motion.cjs').testSupport;
    assert.equal(countPaths([null,'',undefined]),0);
    assert.equal(countPaths(['M 0 0 L 1 1',null]),1);
});
// Trigonometric fixtures: f(x) = A·sin(ωx + φ) + B with A = ω = 1, B = 0 (recipe values); the board's solid curve is listed after a dashed reference and an empty curve.
const trigFixtureMotion=()=>{
    const {sweepValue,motionSpecs,phaseAsPiText,phiReadoutText}=require('./demonstration-preview-motion.cjs').testSupport;
    const spec=motionSpecs['trigonometric-functions'];
    const xs=Array.from({length:81},(_,k)=>-1.5+9*k/80);
    const sample=i=>{
        const phi=sweepValue(i,spec);
        const phiPart=Math.abs(phi)<1e-9?'':` ${phi<0?'−':'+'} ${phaseAsPiText(Math.abs(phi))}`;
        const curve=f=>xs.map(x=>({x,y:f(x)}));
        return {index:i,time:i/24,scheduled:phi,target:phi,actual:{input:phi,readout:phaseAsPiText(phi),steps:0},
            observed:{values:{A:1,omega:1,B:0},equation:`f(x) = sin(x${phiPart})`,phi:phiReadoutText(phi),
                curves:[{id:'ref',dash:3,samples:curve(Math.sin)},{id:'main',dash:0,samples:curve(x=>Math.sin(x+phi))},{id:'empty',dash:0,samples:xs.map(()=>({x:null,y:null}))}]},
            controls:[],points:[],curvePathHash:'paths-'+phi,pathCount:1,capture:{sha256:'recipe-png'}};
    };
    return ()=>({id:'trigonometric-functions',mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
};
test('trigonometric sweep: the solid curve equals A·sin(ωx + φ) + B at the reported φ, A, ω, B fixed, phi readout and equation match the input, seam checked',()=>{
    const {assertMotionEvidence,phaseAsPiText,phiReadoutText,motionSpecs}=require('./demonstration-preview-motion.cjs').testSupport;
    const motion=trigFixtureMotion();
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,0);assert.equal(valid.samples[95].scheduled,0);
    assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),Math.PI);assert.equal(Math.min(...valid.samples.map(s=>s.scheduled)),0);
    assert.deepEqual(motionSpecs['trigonometric-functions'].sweep.waypoints,[0,Math.PI,0]);
    // Readout texts as the runtime writes them (src/analysis/trigonometric.ts): exact multiples of π/12, decimal comma, true minus sign.
    assert.equal(phaseAsPiText(Math.PI/2),'π/2');assert.equal(phaseAsPiText(-Math.PI/4),'−π/4');assert.equal(phaseAsPiText(0),'0');assert.equal(phaseAsPiText(5*Math.PI/12),'5π/12');
    assert.equal(phiReadoutText(-2e-16),'0');assert.equal(phiReadoutText(Math.PI/2),'1,57 (π/2)');assert.equal(phiReadoutText(-Math.PI/4),'−0,79 (−π/4)');
    assert.equal(phiReadoutText(Math.PI/12),'0,26 (π/12)');
    // The function family: a point of the solid curve off A·sin(ωx + φ) by 1e-6 fails.
    const curve=motion();curve.samples[40].observed.curves[1].samples[30].y+=1e-6;
    assert.throws(()=>assertMotionEvidence(curve),/Curve differs from A·sin\(ωx \+ φ\) \+ B at x = /);
    // The sign of the argument: sin(x − φ) instead of sin(x + φ) at the reported φ must fail.
    const sign=motion();sign.samples[40].observed.curves[1].samples.forEach(p=>{p.y=Math.sin(p.x-sign.samples[40].scheduled);});
    assert.throws(()=>assertMotionEvidence(sign),/Curve differs from A·sin/);
    // A, ω or B changed.
    const amplitude=motion();amplitude.samples[40].observed.values.A=1.1;
    assert.throws(()=>assertMotionEvidence(amplitude),/A, omega or B changed at frame 40/);
    // The phi readout is the text of the input.
    const readout=motion();readout.samples[40].observed.phi='0,26 (π/12)';
    assert.throws(()=>assertMotionEvidence(readout),/Phi readout differs from the input at frame 40/);
    // Stale equation after a φ change.
    const equation=motion();equation.samples[40].observed.equation='f(x) = sin(x)';
    assert.throws(()=>assertMotionEvidence(equation),/Equation readout differs from the input at frame 40/);
    // Two solid function curves: the main curve is ambiguous.
    const twice=motion();twice.samples[40].observed.curves.push({id:'extra',dash:0,samples:twice.samples[40].observed.curves[1].samples});
    assert.throws(()=>assertMotionEvidence(twice),/Expected one solid function curve at frame 40/);
    // Too few samples inside the recipe window.
    const window=motion();window.samples[40].observed.curves[1].samples.forEach(p=>{p.x=20;});
    assert.throws(()=>assertMotionEvidence(window),/Too few curve samples in the window at frame 40/);
    // Readout off the schedule (aria-valuetext).
    const readoutOff=motion();readoutOff.samples[40].actual.readout='π/2';
    assert.throws(()=>assertMotionEvidence(readoutOff),/Graph readout differs from target at frame 40/);
    const seam=motion();seam.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seam),/Non-seamless loop: last PNG/);
});
test('sweepValue snaps every existing clip exactly as before the origin option (bit-identical over the 96 frames)',()=>{
    const {sweepValue,motionSpecs}=require('./demonstration-preview-motion.cjs').testSupport;
    // Reference: the pre-origin schedule (phase clamp((i-12)/71), sin² legs, snap to multiples of the step with the step's decimals).
    const legacy=(i,spec)=>{
        const {waypoints,step}=spec.sweep;
        const phase=Math.max(0,Math.min(1,(i-12)/71)),scaled=phase*(waypoints.length-1);
        const leg=Math.min(waypoints.length-2,Math.floor(scaled)),local=scaled-leg,eased=(1-Math.cos(Math.PI*local))/2;
        const v=waypoints[leg]+(waypoints[leg+1]-waypoints[leg])*eased;
        const decimals=(String(step).split('.')[1]||'').length;
        return Number((Math.round(v/step)*step).toFixed(decimals));
    };
    const legacyIds = ['decasteljau','decasteljau-alternative','derivative','ph-cubic','ph-quintic','weighted-parameterization'];
    const existing=Object.entries(motionSpecs).filter(([id])=>legacyIds.includes(id));
    assert.deepEqual(existing.map(([id])=>id).sort(),['decasteljau','decasteljau-alternative','derivative','ph-cubic','ph-quintic','weighted-parameterization']);
    for(const [id,spec] of existing)for(let i=0;i<96;i++)assert.equal(sweepValue(i,spec),legacy(i,spec),`${id} schedule changed at frame ${i}`);
});
test('spline-g1 sweep snaps to the offset grid 0.01 + k·0.0299 and reaches the recipe value exactly',()=>{
    const {sweepValue,motionSpecs,snapToStep}=require('./demonstration-preview-motion.cjs').testSupport;
    const spec=motionSpecs['spline-g1'];
    assert.equal(snapToStep(0.65,0.0299,0.01),0.6379);
    assert.equal(snapToStep(1.53,0.0299,0.01),1.5349);
    assert.equal(snapToStep(0.01,0.0299,0.01),0.01);
    for(let i=0;i<96;i++){
        const v=sweepValue(i,spec),k=Math.round((v-0.01)/0.0299);
        assert.ok(Math.abs(v-(0.01+k*0.0299))<1e-12,`Off-grid value ${v} at frame ${i}`);
        assert.ok(v>=0.1&&v<=3,`Value ${v} outside the range at frame ${i}`);
    }
    assert.equal(sweepValue(0,spec),0.6379);assert.equal(sweepValue(95,spec),0.6379);
});
// G1 spline fixtures: the free points of the recipe (probe on the production build), b2 = 1 (the runtime readout), computed N2 and N3 from the formula.
const splineControls=[{x:-2.5,y:1},{x:-4,y:-1.5},{x:-2.5,y:-2.5},{x:0,y:-1},{x:3,y:1}];
const splineFixtureMotion=()=>{
    const {g1ComputedPoints,sweepValue,motionSpecs}=require('./demonstration-preview-motion.cjs').testSupport;
    const spec=motionSpecs['spline-g1'];
    const sample=i=>{
        const b1=sweepValue(i,spec),{N2,N3}=g1ComputedPoints(splineControls,b1,1);
        const controls=splineControls.map((p,j)=>({id:'c'+j,x:p.x,y:p.y}));
        return {index:i,time:i/24,scheduled:b1,target:b1,actual:{input:b1,readout:(b1+2e-16).toFixed(18).replace('.',','),steps:0},
            controls,fixed:controls,observed:{b2:'1'},
            points:[...controls.map(p=>({...p,name:'$$P$$',draggable:true})),{id:'n2',name:'',x:N2.x,y:N2.y,draggable:false},{id:'n3',name:'',x:N3.x,y:N3.y,draggable:false}],
            curvePathHash:'path-'+b1,pathCount:1,capture:{sha256:'recipe-png'}};
    };
    return ()=>({id:'spline-g1',mode:'parameter-sweep',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>sample(i))});
};
test('spline-g1 sweep: N2 and N3 follow the reported b1 and the b2 readout, G1 holds at both joins, the path follows b1, seam checked',()=>{
    const {assertMotionEvidence,assertG1Join,g1ComputedPoints,motionSpecs}=require('./demonstration-preview-motion.cjs').testSupport;
    const motion=splineFixtureMotion();
    const valid=motion();
    assertMotionEvidence(valid);
    assert.equal(valid.samples[0].scheduled,0.6379);assert.equal(valid.samples[95].scheduled,0.6379);
    assert.equal(Math.max(...valid.samples.map(s=>s.scheduled)),1.5349);
    assert.deepEqual(motionSpecs['spline-g1'].sweep.waypoints,[0.6379,1.5349,0.2492,0.6379]);
    // G1 family: a joint off the tangent line, or a non-positive ratio, must throw.
    const {N2}=g1ComputedPoints(splineControls,0.6379,1);
    assert.doesNotThrow(()=>assertG1Join(splineControls[1],splineControls[2],N2,0.6379,'G1'));
    assert.throws(()=>assertG1Join(splineControls[1],splineControls[2],{x:N2.x,y:N2.y+0.01},0.6379,'G1 fails at join P2'),/G1 fails at join P2/);
    assert.throws(()=>assertG1Join(splineControls[1],splineControls[2],N2,-0.6379,'G1 ratio'),/ratio must be positive/);
    // Computed points: N2 moved off the formula, or N3 stale (not following the chain).
    const n2=motion();n2.samples[40].points[5].x+=0.01;
    assert.throws(()=>assertMotionEvidence(n2),/Computed control points differ from \{N2, N3\} at frame 40/);
    const n3=motion();n3.samples[40].points[6].y+=0.01;
    assert.throws(()=>assertMotionEvidence(n3),/Computed control points differ/);
    // b2 readout changed during the sweep.
    const b2=motion();b2.samples[40].observed.b2='0,9967';
    assert.throws(()=>assertMotionEvidence(b2),/b2 changed from frame 0 at frame 40/);
    // A free point moved.
    const free=motion();free.samples[40].controls[2].x+=0.1;
    assert.throws(()=>assertMotionEvidence(free),/Fixed control point moved/);
    // Readout off by one display unit (0,6380 for 0.6379) fails the numeric readout check.
    const readout=motion();readout.samples[40].actual.readout='0,6380';
    assert.throws(()=>assertMotionEvidence(readout),/Graph readout differs from target/);
    // Input off the schedule.
    const input=motion();input.samples[40].actual.input+=0.0299;
    assert.throws(()=>assertMotionEvidence(input),/Input value differs from target/);
    // The path must change when b1 changes, and must not change while it holds.
    const stalled=motion();stalled.samples[30].curvePathHash=stalled.samples[29].curvePathHash;
    assert.throws(()=>assertMotionEvidence(stalled),/Curve path did not change while b1 moved at frame 30/);
    const held=motion();held.samples[90].curvePathHash='changed-while-held';
    assert.throws(()=>assertMotionEvidence(held),/Curve path changed while b1 held at frame 90/);
    const empty=motion();empty.samples.forEach(s=>{s.pathCount=0;});
    assert.throws(()=>assertMotionEvidence(empty),/Curve path missing/);
    const seam=motion();seam.samples[95].capture.sha256='other-png';
    assert.throws(()=>assertMotionEvidence(seam),/Non-seamless loop: last PNG/);
});
