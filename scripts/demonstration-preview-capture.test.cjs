const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {recipes,validateRecipes,applyAction,assertOutcomeEvidence}=require('./demonstration-preview-recipes.cjs');
const {assertMotionEvidence}=require('./demonstration-preview-motion.cjs');
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
