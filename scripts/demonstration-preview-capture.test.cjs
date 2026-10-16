const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {recipes,validateRecipes,applyAction,assertOutcomeEvidence}=require('./demonstration-preview-recipes.cjs');
const {assertMotionEvidence,encode,sweepValue,deCasteljauLevels,motionSpecs}=require('./demonstration-preview-motion.cjs');
const {publishValidatedSet}=require('./publish-demonstration-previews.cjs');
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
test('semantic assertions reject empty, wrong-degree, missing-Farin and unrevealed evidence',()=>{
    assert.throws(()=>assertOutcomeEvidence('bernstein',{}),/semantic/);
    const evidence={curves:2,points:[],readouts:{},reveals:{},controls:[]};
    assert.throws(()=>assertOutcomeEvidence('bernstein',evidence),/four/);
    assert.throws(()=>assertOutcomeEvidence('repeated-subdivision',evidence),/four/);
    assert.throws(()=>assertOutcomeEvidence('farin',evidence));
    assert.throws(()=>assertOutcomeEvidence('extrema',evidence),/reveal/);
    assert.throws(()=>assertOutcomeEvidence('bisection',evidence),/Three/);
});
test('step provenance requires exact consecutive states and the common camera',()=>{
    const camera=[-1,2,3,-2];
    const motion={id:'repeated-subdivision',frameCount:96,sampleRate:24,duration:4,camera,samples:[0,1,2].map(i=>({checkpoint:i,firstFrame:i*32,holdFrames:32,state:{box:[...camera],curves:2**i}}))};
    assertMotionEvidence(motion);
    motion.samples[1].state.curves=3;assert.throws(()=>assertMotionEvidence(motion));
    motion.samples[1].state.curves=2;motion.samples[2].state.box[0]=-2;assert.throws(()=>assertMotionEvidence(motion));
});
test('smooth evidence rejects stroke compounding, stationary-point drift and a failed exact return',()=>{
    const base=[{id:'p0',x:-4,y:-3},{id:'p1',x:-3,y:2},{id:'p2',x:2,y:2},{id:'p3',x:3,y:-2}];
    const motion={id:'bezier',frameCount:96,sampleRate:24,duration:4,samples:Array.from({length:96},(_,i)=>{
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
        const scheduled=sweepValue(i);
        const levels=deCasteljauLevels(controls,scheduled).flat();
        const points=[...controls.map(p=>({...p,draggable:true})),...levels.map((p,j)=>({id:'i'+j,name:'',x:p.x,y:p.y,draggable:false}))];
        return {index:i,time:i/24,scheduled,actual:{input:scheduled,readout:`t = ${scheduled.toFixed(2)}`,steps:0},
            controls:controls.map(({id,x,y})=>({id,x,y})),points,curvePathHash:`path-${scheduled}`};
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
    const seam=motion();seam.samples[95].curvePathHash='path-jump';
    assert.throws(()=>assertMotionEvidence(seam),/changed while t held|Last frame|Non-seamless/);
    const mismatch=motion();mismatch.samples[40].actual.input+=0.01;
    assert.throws(()=>assertMotionEvidence(mismatch),/Input value differs/);
    const readout=motion();readout.samples[40].actual.readout='t = 0.40';
    assert.throws(()=>assertMotionEvidence(readout),/readout differs/);
    const stalled=motion();stalled.samples[30].curvePathHash=stalled.samples[29].curvePathHash;
    assert.throws(()=>assertMotionEvidence(stalled),/did not change/);
});
test('derivative sweep provenance rejects a moved x0, a wrong secant slope, a moved tangent, a non-seamless end, a non-identical end PNG and the excluded band',()=>{
    const deriv=motionSpecs.derivative,f=x=>x*x,x0=1;
    const sample=i=>{
        const h=sweepValue(i,deriv),q=x0+h,slope=(f(q)-f(x0))/h,intercept=f(x0)-slope*x0;
        return {index:i,time:i/24,scheduled:h,actual:{input:h,readout:deriv.sweep.readout.text(h),steps:0},
            controls:[{id:'p',x:x0,y:f(x0)}],
            points:[{id:'p',name:'$$P$$',x:x0,y:f(x0),draggable:true},{id:'q',name:'$$Q$$',x:q,y:f(q),draggable:false}],
            observed:{P:{x:x0,y:f(x0)},Q:{x:q,y:f(q)},secant:{stdform:[intercept,slope,-1]},tangent:{slope:2,intercept:-1}},
            curvePathHash:'function-and-tangent',capture:{sha256:'recipe-png'}};
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
});
test('Farin pointer-drag provenance rejects a moved control point, a changed non-dragged ratio, a weight text mismatch and a non-seamless end',()=>{
    const {rationalPoint,farinEffectiveWeights,farinWeightText,farinValue,farinPoint,farinParameterTs,sin2OutAndBack}=require('./demonstration-preview-motion.cjs');
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
    assert.ok(Math.abs(Math.max(...valid.samples.map(s=>s.scheduled.v))-0.75)<1e-3);
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
