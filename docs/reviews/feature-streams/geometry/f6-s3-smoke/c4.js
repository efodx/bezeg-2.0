const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const sl=lang==='sl';
const N=sl?{next:'Naslednji korak',reset:'Ponastavi',add:'Dodaj točko',col:'Kolinearna mesta',cocirc:'Štiri mesta na krožnici',ex:'Primer A–D',x:'Nova točka: x',y:'Nova točka: y',p4x:'Točka 4: x',p4y:'Točka 4: y',pts:/Točk: \d+ od največ \d+/}:{next:'Next step',reset:'Reset',add:'Add point',col:'Collinear sites',cocirc:'Four sites on a circle',ex:'Example A–D',x:'New point: x',y:'New point: y',p4x:'Point 4: x',p4y:'Point 4: y',pts:/Points: \d+ of at most \d+/};
const r={};const snap=async()=>{const t=await L.body(p);return {s:await L.step(p),pts:(t.match(N.pts)||[])[0],head:(t.match(/(?:Korak|Step) \d+ (?:od|of) \d+\. [^\n]*/)||[''])[0].slice(0,200)}};
const nxt=async n=>{for(let i=0;i<n;i++){const bt=p.getByRole('button',{name:N.next,exact:true});if(await bt.getAttribute('aria-disabled')==='true')break;await bt.click();await p.waitForTimeout(200)}};
await nxt(4);r.before=await snap();
// drag D (0,-3) -> approx (1.4,-2)
await p.mouse.move(476,681);await p.mouse.down();await p.mouse.move(500,665,{steps:5});await p.mouse.move(520,650,{steps:5});await p.mouse.up();await p.waitForTimeout(500);
r.afterDrag=await snap();r.dInputs=[await p.inputValue(`input[aria-label="${N.p4x}"]`),await p.inputValue(`input[aria-label="${N.p4y}"]`)];
await p.screenshot({path:`c4-${lang}-afterdrag.png`});
// add sites up to 12
const bodyMsgBefore=await L.body(p);
const AP=[[-8,-6],[-6,6],[7,-5],[8,3],[-9,1],[3,-7],[6,7],[-3,-5]];for(let i=0;i<8;i++){await p.fill(`input[aria-label="${N.x}"]`,String(AP[i][0]));await p.fill(`input[aria-label="${N.y}"]`,String(AP[i][1]));await p.getByRole('button',{name:N.add}).click();await p.waitForTimeout(250)}
r.after12=await snap();
// 13th
await p.fill(`input[aria-label="${N.x}"]`,'9');await p.fill(`input[aria-label="${N.y}"]`,'-2');await p.getByRole('button',{name:N.add}).click();await p.waitForTimeout(400);
const t13=await L.body(p);r.after13=await snap();
r.msgDiff13=t13.split('\n').filter(l=>!bodyMsgBefore.split('\n').includes(l)&&!/^\s*$/.test(l)&&!/^[-−\d.]+$/.test(l)).slice(0,12);
await p.screenshot({path:`c4-${lang}-13th.png`});
// to the end, reset
await nxt(20);r.end=await snap();
console.log('DBG',JSON.stringify(r),await p.locator('[data-action=reset]').evaluate(e=>e.outerHTML),JSON.stringify(r.end));fs.writeFileSync('dbg.txt',await L.body(p));await p.screenshot({path:'dbg.png'});await p.locator('[data-action=reset]').click();await p.waitForTimeout(300);r.reset=await snap();
// degenerate
await p.getByRole('button',{name:N.col}).click();await p.waitForTimeout(400);await nxt(12);
let t=await L.body(p);r.collinear={snap:await snap(),text:t.slice(t.search(/Korak \d|Step \d/),t.search(/Korak \d|Step \d/)+420).replace(/\n+/g,' | ')};await p.screenshot({path:`c5-${lang}-collinear.png`});
await p.getByRole('button',{name:N.cocirc}).click();await p.waitForTimeout(400);await nxt(12);
t=await L.body(p);r.cocircular={snap:await snap(),text:t.slice(t.search(/Korak \d|Step \d/),t.search(/Korak \d|Step \d/)+420).replace(/\n+/g,' | ')};await p.screenshot({path:`c5-${lang}-cocircular.png`});
// move onto another site
await p.getByRole('button',{name:N.ex}).click();await p.waitForTimeout(400);
const before=await L.body(p);
await p.fill(`input[aria-label="${N.p4x}"]`,'-4');await p.fill(`input[aria-label="${N.p4y}"]`,'3');await p.keyboard.press('Enter');await p.waitForTimeout(300);await p.keyboard.press('Tab');await p.waitForTimeout(500);
const after=await L.body(p);r.onto={d:[await p.inputValue(`input[aria-label="${N.p4x}"]`),await p.inputValue(`input[aria-label="${N.p4y}"]`)],diff:after.split('\n').filter(l=>!before.split('\n').includes(l)&&l.trim()).slice(0,8)};
await p.screenshot({path:`c5-${lang}-onto.png`});
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c4.json',JSON.stringify(out,null,1))})();
