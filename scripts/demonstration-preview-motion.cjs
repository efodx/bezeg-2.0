const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const crypto = require('node:crypto');
const {recipes, applyAction, settle} = require('./demonstration-preview-recipes.cjs');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function assertMotionEvidence(motion) {
    assert.ok(Array.isArray(motion.samples));
    assert.equal(motion.frameCount,72);assert.equal(motion.sampleRate,24);
    if(motion.id==='bezier') {
        assert.equal(motion.samples.length,72);
        const first=motion.samples[0],last=motion.samples[71];
        assert.equal(first.points.length,4);
        for(const [i,sample] of motion.samples.entries()) {
            assert.equal(sample.index,i);assert.equal(sample.time,i/24);
            assert.deepEqual(sample.strokeWidths,first.strokeWidths);
            assert.equal(sample.points.length,4);
            first.points.forEach((p,j)=>{
                const actual=sample.points[j];assert.equal(actual.id,p.id);
                const expected=j===1 && i>0 && i<71?sample.target:p;
                const tolerance=j===1 && i>0 && i<71?0.035:1e-9;
                assert.ok(Math.abs(actual.x-expected.x)<tolerance&&Math.abs(actual.y-expected.y)<tolerance,'Invalid Bézier control-point sample');
            });
        }
        assert.notEqual(first.curvePathHash,motion.samples[35].curvePathHash);
        assert.equal(first.curvePathHash,last.curvePathHash,'The original curve must return exactly');
    } else {
        assert.ok(['repeated-subdivision','bisection'].includes(motion.id));
        assert.equal(motion.samples.length,3);
        motion.samples.forEach((sample,i)=>{
            assert.equal(sample.checkpoint,motion.id==='bisection'?i+1:i);
            assert.equal(sample.firstFrame,i*24);assert.equal(sample.holdFrames,24);
            assert.deepEqual(sample.state.box,motion.camera);
            if(motion.id==='bisection')assert.equal(sample.state.readouts.step,String(i+1));
            else assert.equal(sample.state.curves,2**i);
        });
    }
}

async function boardSnapshot(page) {
    return page.locator('#jgbox').evaluate(container => {
        const b = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
        const visible = Object.values(b.objects).filter(o => o.visProp?.visible !== false && o.visProp?.visible !== 'false' && o.rendNode && getComputedStyle(o.rendNode).visibility !== 'hidden' && getComputedStyle(o.rendNode).display !== 'none');
        return {box: b.getBoundingBox(), scale: [b.unitX, b.unitY], curves: visible.filter(o => o.elType === 'curve').length,
            points: visible.filter(o => o.elType === 'point').map(o => ({id: o.id, name: o.name, x: o.X(), y: o.Y(), fixed: o.visProp.fixed})),
            paths: visible.filter(o => o.elType === 'curve').map(o => o.rendNode.getAttribute('d')),
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

function encode(framesDirectory, output, fps = 24) {
    const settings = ['-y','-loglevel','error','-framerate',String(fps),'-i',path.join(framesDirectory,'%03d.png'),'-an','-c:v','libvpx-vp9','-crf','34','-b:v','0','-pix_fmt','yuv420p','-row-mt','1',output];
    execFileSync(process.env.PREVIEW_FFMPEG || 'ffmpeg',settings,{timeout:120000});
    const probe = JSON.parse(execFileSync(process.env.PREVIEW_FFPROBE || 'ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
    const video = probe.streams.find(s => s.codec_type === 'video');
    assert.equal(video.width,720); assert.equal(video.height,440);
    assert.equal(probe.streams.length,1,'Motion must be silent');
    const duration = Number(probe.format.duration);
    assert.ok(duration >= 2 && duration <= 4);
    const bytes = fs.statSync(output).size;
    assert.ok(bytes <= 300*1024,`Motion over 300KiB: ${bytes}`);
    return {file:path.basename(output),sha256:digest(output),type:'video/webm',duration,bytes,width:video.width,height:video.height,codec:video.codec_name,
        encoder:execFileSync(process.env.PREVIEW_FFMPEG || 'ffmpeg',['-version'],{encoding:'utf8'}).split(/\r?\n/)[0], arguments:settings};
}

async function generateMotions(browser, demonstrations, output, baseUrl, presentBoard) {
    const motions=[];
    for (const id of ['repeated-subdivision','bisection','bezier']) {
        const started=Date.now();
        const d=demonstrations.find(d=>d.id===id);
        const directory=path.join(output,'frames-'+id); fs.mkdirSync(directory,{recursive:true});
        const window=id==='bisection'?[0.85,2.3,2.15,-1.25]:[-5,4.5,4.5,-4];
        const sampleEvidence=[];
        let fixedBox;
        if (id!=='bezier') {
            // Independent exact checkpoint replays: no runtime Play and no elapsed-time state selection.
            for(let checkpoint=0;checkpoint<3;checkpoint++) {
                const {page,context}=await openRoute(browser,d,baseUrl);
                try {
                    const steps=id==='bisection'?checkpoint+1:checkpoint;
                    if(steps)await applyAction(page,{kind:'button',label:id==='bisection'?'Naslednji korak':'Subdiviziraj',count:steps});
                    const scene=await presentBoard(page.locator('#jgbox'),d,recipes[id],{window});
                    fixedBox ||=scene.boundingBox; assert.deepEqual(scene.boundingBox,fixedBox,'Camera changed between exact checkpoints');
                    const state=await boardSnapshot(page);
                    if(id==='repeated-subdivision')assert.equal(state.curves,2**steps);
                    else assert.equal(state.readouts.step,String(steps));
                    const index=checkpoint*24;
                    const captured=await screenshotBoard(page,path.join(directory,String(index).padStart(3,'0')+'.png'));
                    for(let hold=1;hold<24;hold++)fs.copyFileSync(path.join(directory,captured.file),path.join(directory,String(index+hold).padStart(3,'0')+'.png'));
                    sampleEvidence.push({checkpoint:steps,firstFrame:index,holdFrames:24,capture:captured,state});
                }finally{await context.close();}
            }
        } else {
            const {page,context}=await openRoute(browser,d,baseUrl);
            try {
                await applyAction(page,{kind:'toggle',label:'Kontrolni poligon',value:true});
                await presentBoard(page.locator('#jgbox'),d,recipes[id],{window});
                const initial=await boardSnapshot(page); fixedBox=initial.box;
                const points=initial.points.filter(p=>p.fixed!==true);
                assert.equal(points.length,4,'Expected the original four draggable Bézier points');
                const moved=points[1];
                const screen=async(x,y)=>page.locator('#jgbox').evaluate((e,{x,y})=>{const b=Object.values(window.JXG.boards).find(b=>b.container==='jgbox');const r=e.getBoundingClientRect();return {x:r.left+b.origin.scrCoords[1]+b.unitX*x,y:r.top+b.origin.scrCoords[2]-b.unitY*y};},{x,y});
                const start=await screen(moved.x,moved.y);
                for(let i=0;i<72;i++) {
                    const phase=i/71;const displacement=Math.sin(Math.PI*phase)**2;
                    const target={x:moved.x+1.25*displacement,y:moved.y+1.5*displacement};
                    if(i===1){await page.mouse.move(start.x,start.y);await page.mouse.down();}
                    if(i>0 && i<71){const at=await screen(target.x,target.y);await page.mouse.move(at.x,at.y);}
                    if(i===71){
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
                    await presentBoard(page.locator('#jgbox'),d,recipes[id],{window});
                    const state=await boardSnapshot(page);
                    assert.deepEqual(state.box,fixedBox);
                    assert.deepEqual(state.strokeWidths,initial.strokeWidths,'Capture presentation compounded stroke widths');
                    for(const original of points) {
                        const actual=state.points.find(p=>p.id===original.id);assert.ok(actual);
                        const expected=original.id===moved.id?target:original;
                        const tolerance=original.id===moved.id && i!==0 && i!==71?0.035:1e-9;
                        assert.ok(Math.abs(actual.x-expected.x)<tolerance&&Math.abs(actual.y-expected.y)<tolerance,`Unexpected control-point position at sample${i}: ${JSON.stringify({actual,expected})}`);
                    }
                    if(i===35)assert.notDeepEqual(state.paths,initial.paths,'Pointer motion did not recompute the real curve');
                    const captured=await screenshotBoard(page,path.join(directory,String(i).padStart(3,'0')+'.png'));
                    sampleEvidence.push({index:i,time:i/24,phase,target,capture:captured,points:state.points,strokeWidths:state.strokeWidths,curvePathHash:crypto.createHash('sha256').update(state.paths.join('\n')).digest('hex')});
                }
                await page.mouse.up();
                const final=await boardSnapshot(page);
                for(const original of points){const actual=final.points.find(p=>p.id===original.id);assert.ok(Math.abs(actual.x-original.x)<1e-9&&Math.abs(actual.y-original.y)<1e-9);}
            }finally{await context.close();}
        }
        const encoded=encode(directory,path.join(output,id+'.webm'));
        motions.push({id,...encoded,frameCount:72,sampleRate:24,camera:fixedBox,mode:id==='bezier'?'pointer-control-point':'discrete-exact-steps',
            samples:sampleEvidence,sourceFrameHashMeaning:'SHA-256 of lossless PNG inputs; compressed WebM frames are not claimed pixel-identical',generationSeconds:(Date.now()-started)/1000});
        assertMotionEvidence(motions.at(-1));
        console.log(`Encoded ${id}: ${encoded.bytes} bytes, ${encoded.duration}s`);
    }
    return motions;
}

async function generateAffineComparison(browser,d,output,baseUrl,presentBoard) {
    const affine=d.id==='affine';
    const panels=[];const window=affine?[-3.5,2.9,3.8,-2.9]:[-5,4.3,5,-3.5];
    for(const transformed of [false,true]) {
        const {page,context}=await openRoute(browser,d,baseUrl);
        try {
            await applyAction(page,{kind:'toggle',label:'Kontrolni poligon',value:true});
            if(transformed)await applyAction(page,{kind:'button',label:affine?'Rotiraj desno: 18°':'Dvigni stopnjo'});
            if(!affine){
                await applyAction(page,{kind:'button',label:'Krivulja1'});
                await applyAction(page,{kind:'toggle',label:'Uteži',value:true});
                await applyAction(page,{kind:'button',label:'Prekliči izbiro'});
            }
            await presentBoard(page.locator('#jgbox'),d,recipes[d.id],{frame:{width:180,height:220},window});
            await page.locator('#jgbox').evaluate((e,label)=>{const text=document.createElement('span');text.textContent=label;text.style.cssText='position:absolute;left:8px;top:6px;font:600 13px system-ui;color:#172d27;background:#fff;z-index:10;padding:2px 4px';e.appendChild(text);},affine?(transformed?'Po rotaciji 18°':'Pred rotacijo'):(transformed?'Stopnja 4':'Stopnja 3'));
            const file=path.join(output,d.id+(transformed?'-after.png':'-before.png'));
            panels.push({...await screenshotBoard(page,file),transformed,state:await boardSnapshot(page)});
        }finally{await context.close();}
    }
    if(affine)assert.equal(panels[0].state.points.length,panels[1].state.points.length);
    else {assert.equal(panels[0].state.points.length,4);assert.equal(panels[1].state.points.length,5);}
    assert.deepEqual(panels[0].state.box,panels[1].state.box);
    for(const panel of panels)assert.ok(Math.abs(panel.state.scale[0]-panel.state.scale[1])<1e-8);
    const original=panels[0].state.points,rotated=panels[1].state.points;
    const center=original.reduce((a,p)=>({x:a.x+p.x/original.length,y:a.y+p.y/original.length}),{x:0,y:0});
    const theta=Math.PI/10;
    if(affine)original.forEach((p,i)=>{
        const x=center.x+(p.x-center.x)*Math.cos(theta)-(p.y-center.y)*Math.sin(theta);
        const y=center.y+(p.x-center.x)*Math.sin(theta)+(p.y-center.y)*Math.cos(theta);
        assert.ok(Math.abs(rotated[i].x-x)<1e-9&&Math.abs(rotated[i].y-y)<1e-9,'Affine panel does not show the supported 18 degree rotation');
    });
    if(affine)assert.notDeepEqual(panels[0].state.paths,panels[1].state.paths);
    else {
        const weights=[1,2,1,1];
        for(let i=0;i<=4;i++) {
            const left=original[Math.max(0,i-1)],right=original[Math.min(3,i)];
            const a=i===0?0:i/4*weights[i-1];
            const b=i===4?0:(1-i/4)*weights[i];
            const expected={x:(a*left.x+b*right.x)/(a+b),y:(a*left.y+b*right.y)/(a+b)};
            assert.ok(Math.abs(rotated[i].x-expected.x)<1e-9&&Math.abs(rotated[i].y-expected.y)<1e-9,'Rational elevation must use the exact homogeneous control-point formula');
        }
    }
    const args=['-y','-loglevel','error','-i',path.join(output,d.id+'-before.png'),'-i',path.join(output,d.id+'-after.png'),'-filter_complex','hstack=inputs=2','-frames:v','1',path.join(output,d.id+'.png')];
    execFileSync(process.env.PREVIEW_FFMPEG||'ffmpeg',args,{timeout:30000});
    return {kind:'two-real-board-panels',panels,composition:'FFmpeg lossless PNG hstack; no geometry pixel scaling; each panel 360x440; equal unit scales and same camera',camera:panels[0].state.box,sceneBounds:{minX:window[0],maxX:window[2],minY:window[3],maxY:window[1]}};
}

module.exports={generateMotions,generateAffineComparison,boardSnapshot,screenshotBoard,openRoute,encode,assertMotionEvidence};
