// Usage: node capture.cjs <proto|cur> <label>   (label: before | after). Writes feel/03/<label>-<target>-<scenario>.png sheets and .json stats.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const [,, target, label]=process.argv;
const OUT=__dirname;
const URL={proto:'http://127.0.0.1:4460/bezeg-2.0/analysis/taylor',cur:'http://127.0.0.1:4483/bezeg-2.0/analysis/taylor'}[target];
const SEL=target==='proto'
  ?{card:id=>`[data-dock-item].ux-bcard-${id}`,title:id=>`[data-dock-item].ux-bcard-${id} .ux-btext-title`,fold:id=>`[data-dock-item].ux-bcard-${id} .ux-btext-toggle[aria-expanded]`,ids:{odcitki:'readout'}}
  :{card:id=>`.board-cards-layer [data-card-id=${id}]`,title:id=>`.board-cards-layer [data-card-id=${id}] .board-card-title`,fold:id=>`.board-cards-layer [data-card-id=${id}] .board-card-fold`,ids:{odcitki:'readouts'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await chromium.launch();
const ctx=await br.newContext({viewport:{width:1440,height:900}});
async function fresh(){const p=await ctx.newPage();await p.goto(URL);await p.evaluate(()=>localStorage.removeItem('bezeg-2.0:board-layout'));await p.goto(URL);await p.waitForSelector(SEL.card(SEL.ids.odcitki),{timeout:20000});await p.waitForTimeout(2500);return p}
async function record(p,action,tail=450){
  const cdp=await ctx.newCDPSession(p);const frames=[];
  cdp.on('Page.screencastFrame',async f=>{frames.push({t:f.metadata.timestamp*1000,data:f.data});try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId})}catch{}});
  await p.evaluate(()=>{window.__rects=[];const s=()=>{const t=performance.now();const o={};document.querySelectorAll('[data-card-id]:not([style*="-100000"]),[data-dock-item]').forEach(c=>{const b=c.getBoundingClientRect();if(b.x<-1000)return;o[c.dataset.cardId||c.className.match(/ux-bcard-(\w+)/)?.[1]]=[b.x,b.y,c.offsetWidth,c.offsetHeight]});window.__rects.push({t,o});window.__raf=requestAnimationFrame(s)};s()});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:55,maxWidth:1440,maxHeight:900,everyNthFrame:1});
  const t0=Date.now();await action();await sleep(tail);
  await cdp.send('Page.stopScreencast');
  const rects=await p.evaluate(()=>{cancelAnimationFrame(window.__raf);return window.__rects});
  return {frames,rects};}
async function mv(p,pts,dt=16){for(const [x,y] of pts){await p.mouse.move(x,y);await sleep(dt)}}
function lerp(a,b,n){return Array.from({length:n},(_,i)=>[a[0]+(b[0]-a[0])*(i+1)/n,a[1]+(b[1]-a[1])*(i+1)/n])}
async function boardBox(p){return p.evaluate(()=>{const b=document.getElementById('jgbox').getBoundingClientRect();return {x:b.left,y:b.top,w:b.width,h:b.height}})}
async function titleCenter(p,id){const b=await p.locator(SEL.title(id)).boundingBox();return [b.x+b.width/2,b.y+b.height/2]}
const scen={
 async a(p){const bb=await boardBox(p);const s=await titleCenter(p,SEL.ids.odcitki);const e=[bb.x+110,bb.y+bb.h-60];
  return record(p,async()=>{await p.mouse.move(...s);await p.mouse.down();await sleep(120);await mv(p,lerp(s,e,40));await sleep(250);await p.mouse.up()},650)},
 async b(p){return record(p,async()=>{await p.locator(SEL.fold(SEL.ids.odcitki)).click();await sleep(500);await p.locator(SEL.fold(SEL.ids.odcitki)).click()},700)},
 async c(p){const bb=await boardBox(p);const s=await titleCenter(p,SEL.ids.odcitki);
  const left=[bb.x+110,bb.y+bb.h/2],top=[bb.x+bb.w/2,bb.y+50],free=[bb.x+bb.w*0.42,bb.y+bb.h*0.45];
  return record(p,async()=>{await p.mouse.move(...s);await p.mouse.down();await sleep(100);await mv(p,lerp(s,left,25));await sleep(300);await mv(p,lerp(left,top,25));await sleep(300);await mv(p,lerp(top,free,25));await sleep(300);await p.mouse.up()},650)},
};
async function sheet(name,frames,rects){
  // pick ~24 frames evenly from the frames that differ, crop to the board area
  const n=Math.min(24,frames.length);const pick=Array.from({length:n},(_,i)=>frames[Math.round(i*(frames.length-1)/Math.max(1,n-1))]);
  const t0=frames[0].t;
  const html=`<body style="margin:0;background:#222;font:11px monospace;color:#fff"><div style="display:grid;grid-template-columns:repeat(4,450px);gap:2px">${pick.map(f=>`<div style="width:450px;height:281px;overflow:hidden;position:relative"><img style="position:absolute;left:0;top:0;width:450px" src="data:image/jpeg;base64,${f.data}"><span style="position:absolute;left:2px;top:2px;background:#000a;padding:1px 3px">${Math.round(f.t-t0)}ms</span></div>`).join('')}</div>`;
  const pg=await ctx.newPage();await pg.setViewportSize({width:1806,height:(Math.ceil(n/4))*283});await pg.setContent(html);await pg.waitForTimeout(300);
  await pg.screenshot({path:path.join(OUT,`${label}-${target}-${name}.png`)});await pg.close();
  // stats: distinct sizes per card, max per-frame position step
  const stats={frames:frames.length,span:Math.round(frames.at(-1).t-t0)};const ids=new Set(rects.flatMap(r=>Object.keys(r.o)));
  for(const id of ids){const sizes=new Set(),seq=[];let maxStep=0,prev=null;
    for(const r of rects){const v=r.o[id];if(!v)continue;sizes.add(v[2]+'x'+v[3]);if(prev)maxStep=Math.max(maxStep,Math.hypot(v[0]-prev[0],v[1]-prev[1]));prev=v}
    stats[id]={sizes:[...sizes],maxPosStepPerRaf:Math.round(maxStep)}}
  fs.writeFileSync(path.join(OUT,`${label}-${target}-${name}.json`),JSON.stringify(stats,null,1));
  console.log(name,JSON.stringify(stats));
}
for(const name of ['a','b','c']){const p=await fresh();try{const r=await scen[name](p);await sheet(name,r.frames,r.rects)}catch(e){console.log(name,'ERR',e.message.slice(0,200))}
 await p.evaluate(()=>localStorage.removeItem('bezeg-2.0:board-layout'));await p.close()}
await br.close()})();
