import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./three-prototype.js', import.meta.url), 'utf8');
function declaration(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists in the renderer source`);
  const open = text.indexOf('{', start); let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  assert.fail(`${name} declaration is complete`);
}
class Vector3 {
  constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
  clone(){return new Vector3(this.x,this.y,this.z);}
  project(){return this;}
  distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}
}
class Raycaster {
  setFromCamera(){this.ray={origin:new Vector3(0,0,10)};}
  intersectObjects(objects){Raycaster.objects=objects;return Raycaster.hits;}
}
const T={Vector3,Vector2:Vector3,Raycaster};
const board={getBoundingClientRect:()=>({width:640,height:480})};
function layoutFor(text, overrides={}) {
  const state={kind:'tensor',uv:[.3,.4]};
  const owned={THREE:T,net:[[0,0,0]],tensorNet:[],triangles:[{id:'surface'}],controlMeshes:[{id:'owner'},{id:'other'}]};
  const evaluate=()=>[0,0,0];
  const fn=new Function('owned','state','evaluate','$',`${declaration(source,'resolveLabelPoint')}\n${declaration(text,'labelLayout')}\nreturn labelLayout;`)(owned,state,evaluate,()=>board);
  const label={el:{textContent:'1'},point:[0,0,0],index:0,...overrides};
  return {layout:fn(label),owned,label};
}
Raycaster.hits=[{distance:8}];
const occluded=layoutFor(source);
assert.equal(occluded.layout.visible,false,'a surface/other-point hit well before the label suppresses it');
assert.deepEqual(Raycaster.objects.map(o=>o.id||'surface'),['surface','other'],'the target sphere is excluded while other control spheres remain occluders');
Raycaster.hits=[{distance:9.95}];
const front=layoutFor(source);
assert.equal(front.layout.visible,true,'near-coincident surface hits within the tessellation tolerance preserve a surface label');
Raycaster.hits=[];
const outside=layoutFor(source,{index:null,point:[2,0,0]});
assert.equal(outside.layout.visible,false,'labels outside the camera frustum are hidden');
const hiddenMutation=source.replace('hit.distance<distance-.12','false');
assert.notEqual(hiddenMutation,source,'occlusion mutation changes the renderer source');
Raycaster.hits=[{distance:8}];
const mutantLabel=new Function('owned','state','evaluate','$',`${declaration(source,'resolveLabelPoint')}\n${declaration(hiddenMutation,'labelLayout')}\nreturn labelLayout;`)(occluded.owned,{kind:'tensor',uv:[.3,.4]},()=>[0,0,0],()=>board);
assert.throws(()=>assert.equal(mutantLabel(occluded.label).visible,false),/true/,'removing the depth test reproduces the hidden-label regression');

function svgExport(text=source) {
  let rendered=0, forced=false, result;
  class FakeBlob { constructor(parts,options){this.text=parts.join('');this.type=options.type;} }
  const owned={renderer:{render(){rendered++;},domElement:{toDataURL:()=> 'data:image/png;base64,AA==' }},labels:[{el:{textContent:'Visible & <P>'}},{el:{textContent:'Hidden'}}],labelLayouts:new Map()};
  const visible=owned.labels[0],hidden=owned.labels[1];
  owned.labelLayouts.set(visible,{x:123,y:45,visible:true});owned.labelLayouts.set(hidden,{x:9,y:10,visible:false});
  const fn=new Function('owned','$','positionLabels','download','Blob',`${declaration(text,'exportSvg')}\nreturn exportSvg;`)(owned,()=>board,force=>{forced=force;},(blob,name)=>{result={blob,name};},FakeBlob);
  fn();
  return {rendered,forced,...result};
}
const svg=svgExport();
assert.equal(svg.rendered,1,'SVG export captures the current WebGL scene');
assert.equal(svg.forced,true,'SVG export refreshes camera and label visibility');
assert.equal(svg.name,'bezier-patch-three.svg');
assert.equal(svg.blob.type,'image/svg+xml');
assert.match(svg.blob.text,/<image href="data:image\/png;base64,AA=="/,'SVG carries the depth-correct scene as embedded PNG');
assert.match(svg.blob.text,/<text[^>]*>Visible &amp; &lt;P&gt;<\/text>/,'visible labels remain vector and XML-escaped');
assert.doesNotMatch(svg.blob.text,/>Hidden<\/text>/,'occluded labels are omitted from SVG');
const exportMutation=source.replace("if(!layout?.visible)return'';","if(false)return'';");
assert.notEqual(exportMutation,source,'label-filter mutation changes the SVG exporter');
assert.throws(()=>assert.doesNotMatch(svgExport(exportMutation).blob.text,/>Hidden<\/text>/),/Hidden/,'removing SVG visibility filtering reproduces a hidden label in the export');
console.log('Three export/depth assertions passed: occlusion, owner-sphere tolerance, frustum clipping, fresh embedded-raster SVG, shared visible vector labels, and two failing mutations.');

if (process.env.BEZEG_THREE_EXPORT_BROWSER === '1') {
  const { createRequire } = await import('node:module');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const { createHash } = await import('node:crypto');
  const { chromium } = createRequire(import.meta.url)('playwright');
  const out = path.resolve(process.env.BEZEG_THREE_EXPORT_OUT || '.command-logs/three-export-depth');
  await mkdir(out, { recursive: true });
  const inject = `window.__touchDebug={pointer:()=>owned.pointer,hit:(x,y)=>rayFor({clientX:x,clientY:y}).intersectObjects(owned.controlMeshes,false).map(h=>({index:h.object.userData.pointIndex,distance:h.distance})),project:i=>{const r=$('main-board').getBoundingClientRect(),p=owned.controlMeshes[i].getWorldPosition(new owned.THREE.Vector3()).project(owned.camera);return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}},labels:()=>owned.labels.map(x=>({text:x.el.textContent,index:x.index,visible:owned.labelLayouts.get(x)?.visible}))};`;
  const digest = createHash('sha256').update(source).digest('hex');
  const browser = await chromium.launch({ headless: true });
  const results = { sourceSha256: digest, renderer: 'three.js r180', presets: [], touch: null, errors: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => results.errors.push(error.message));
    await page.route('**/three-prototype.js', async route => {
      const response = await route.fetch(), bytes = await response.body();
      assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, 'served source exactly matches changed prototype');
      await route.fulfill({ response, body: source.replace('window.BezierPatchSpike=', inject + 'window.BezierPatchSpike=') });
    });
    await page.goto('http://127.0.0.1:4181/docs/prototypes/bezier-patches/three.html');
    await page.waitForFunction(() => window.BezierPatchSpike?.ready());
    async function capturePng(url) {
      return page.evaluate(async dataUrl => {
        const image=new Image(); image.src=dataUrl; await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let nonWhite=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<245||pixels[i+1]<245||pixels[i+2]<245)nonWhite++;
        return {width:canvas.width,height:canvas.height,nonWhite};
      },url);
    }
    for (const kind of ['tensor','triangular']) {
      await page.selectOption('#kind',kind);await page.waitForTimeout(100);
      for (const view of ['front','top','side','isometric']) {
        await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(60);
        const before=await page.evaluate(()=>({png:document.querySelector('#main-board canvas').toDataURL('image/png'),labels:[...document.querySelector('#labels').children].filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0).map(el=>el.textContent)}));
        const image=await capturePng(before.png);assert.ok(image.nonWhite>100,`${kind}/${view} scene PNG contains rendered non-white pixels`);
        const svgDownload=page.waitForEvent('download');await page.locator('#export-svg').click();const svgFile=await svgDownload;const svgPath=path.join(out,`${kind}-${view}.svg`);await svgFile.saveAs(svgPath);const svgText=await readFile(svgPath,'utf8');
        const svgInfo=await page.evaluate(async text=>{const doc=new DOMParser().parseFromString(text,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('SVG export is malformed XML');const href=doc.querySelector('image')?.getAttribute('href'),image=new Image();image.src=href;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const px=ctx.getImageData(0,0,canvas.width,canvas.height).data;let nonWhite=0;for(let i=0;i<px.length;i+=4)if(px[i]<245||px[i+1]<245||px[i+2]<245)nonWhite++;return{href,width:image.naturalWidth,height:image.naturalHeight,nonWhite,texts:[...doc.querySelectorAll('text')].map(x=>x.textContent)};},svgText);
        assert.equal(svgInfo.href,before.png,`${kind}/${view} SVG embeds the fresh WebGL canvas byte-for-byte`);
        assert.ok(svgInfo.nonWhite>100,`${kind}/${view} embedded scene image decodes with rendered geometry`);
        assert.deepEqual(svgInfo.texts.sort(),before.labels.slice().sort(),`${kind}/${view} SVG vector labels match the on-screen visible labels`);
        const pngDownload=page.waitForEvent('download');await page.locator('#export-png').click();const pngFile=await pngDownload;const pngPath=path.join(out,`${kind}-${view}-export.png`);await pngFile.saveAs(pngPath);const pngData='data:image/png;base64,'+(await readFile(pngPath)).toString('base64');const decoded=await capturePng(pngData);assert.ok(decoded.width>0&&decoded.height>0&&decoded.nonWhite>100,`${kind}/${view} PNG export decodes with rendered geometry`);
        results.presets.push({kind,view,visibleLabels:before.labels.length,vectorLabels:svgInfo.texts.length,svgEmbeddedPng:[svgInfo.width,svgInfo.height],png:[decoded.width,decoded.height],nonWhite:decoded.nonWhite});
        await page.screenshot({path:path.join(out,`${kind}-${view}.png`)});
      }
    }
    await page.selectOption('#kind','triangular');await page.locator('[data-view="isometric"]').click();await page.waitForTimeout(100);
    const debugLabels=()=>page.evaluate(()=>__touchDebug.labels());
    const spot=async index=>page.locator('#labels').evaluate((host,i)=>{const el=[...host.children].find(x=>x.textContent===String(i+1));if(!el)throw Error(`Missing label ${i+1}`);const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,visible:getComputedStyle(el).display!=='none'&&r.width>0&&r.height>0};},index);
    const firstVisible=await debugLabels(),pointZero=firstVisible.find(x=>x.index===0&&x.visible);assert.ok(pointZero,'triangular isometric exposes control point 1');const origin=await spot(0);await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(origin.x+55,origin.y-18,{steps:7});await page.mouse.up();await page.waitForTimeout(80);const pointOneProjection=await page.evaluate(()=>__touchDebug.project(1)),initialPointOneHits=await page.evaluate(p=>__touchDebug.hit(p.x,p.y),pointOneProjection),initialPointOneLabel=(await debugLabels()).find(x=>x.index===1);assert.equal(initialPointOneLabel?.visible,true,'point 2 label is initially visible before its XY touch move');assert.equal(initialPointOneHits[0]?.index,1,'point 2 label center initially selects its owner');const pointOneSpot=await spot(1),pointOneCdp=await context.newCDPSession(page);await pointOneCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pointOneSpot,id:1}]});const pointOnePointer=await page.evaluate(()=>__touchDebug.pointer());await pointOneCdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pointOneSpot.x+58,y:pointOneSpot.y+20,id:1}]});await pointOneCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);assert.equal(pointOnePointer?.mode,'point','the diagnosed XY touch starts on point 2');const movedProjection=await page.evaluate(()=>__touchDebug.project(1)),overlapHits=await page.evaluate(p=>__touchDebug.hit(p.x,p.y),movedProjection),pointOneLabel=(await debugLabels()).find(x=>x.index===1);assert.ok(overlapHits.length,'moved point 2 projection still has a point-sphere hit');if(overlapHits[0].index!==1)assert.equal(pointOneLabel?.visible,false,'after the overlap-producing XY touch, hidden point 2 label is suppressed');results.touchOverlap={owner:1,visible:pointOneLabel?.visible,frontmost:overlapHits[0].index,frontmostDistance:overlapHits[0].distance};await page.screenshot({path:path.join(out,'triangular-point2-occlusion.png')});
    const initial=await debugLabels();let visibleControl=initial.find(x=>x.index!==null&&x.visible);
    assert.ok(visibleControl,'triangular isometric view exposes at least one visible control label');
    let initialSpot=await spot(visibleControl.index);const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...initialSpot,id:1}]});
    let pointer=await page.evaluate(()=>__touchDebug.pointer());
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:initialSpot.x+55,y:initialSpot.y-18,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);
    assert.equal(pointer?.mode,'point','touch XY starts on the visible, unoccluded label owner');const owner=pointer.index;
    const projected=await page.evaluate(i=>__touchDebug.project(i),owner),hit=await page.evaluate(p=>__touchDebug.hit(p.x,p.y),projected),postLabels=await debugLabels(),ownerLabel=postLabels.find(x=>x.index===owner);
    assert.equal(hit[0]?.index,owner,'projected visible owner remains the nearest point-sphere hit after XY drag');assert.equal(ownerLabel?.visible,true,'visible owner keeps its label after the combined XY move');
    const beforeZ=await page.evaluate(()=>BezierPatchSpike.snapshot()),zSpot=await spot(owner);await page.locator('#z-mode').check();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...zSpot,id:1}]});pointer=await page.evaluate(()=>__touchDebug.pointer());
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:zSpot.x,y:zSpot.y-24,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);
    const afterZ=await page.evaluate(()=>BezierPatchSpike.snapshot()),delta=afterZ.net[owner].map((x,i)=>x-beforeZ.net[owner][i]);
    assert.equal(pointer?.index,owner,'touch z starts on the same visible point');assert.ok(Math.hypot(delta[0],delta[1])<1e-8&&Math.abs(delta[2])>1e-5,'second touch phase changes only z');assert.deepEqual(afterZ.camera,beforeZ.camera,'XY and z touch editing leave the camera fixed');
    results.touch={owner,xyPointMode:true,zPointMode:pointer?.mode==='point',zDelta:delta[2],cameraFixed:true};
    await page.screenshot({path:path.join(out,'triangular-combined-xy-z.png')});await context.close();
  } finally { await browser.close(); }
  assert.equal(results.presets.length,8,'all tensor and triangular four-view presets were exercised');
  assert.equal(results.errors.length,0,'browser reported no page errors');
  await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log(`Three export/depth browser assertions passed: ${JSON.stringify(results)}`);
}
