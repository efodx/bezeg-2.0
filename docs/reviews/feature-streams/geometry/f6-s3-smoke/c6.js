const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const sl=lang==='sl';const r={};
const N=sl?{col:'Kolinearna mesta',cocirc:'Štiri mesta na krožnici',note:/kolinear|vzporedn/i}:{col:'Collinear sites',cocirc:'Four sites on a circle',note:/collinear|parallel/i};
await p.getByRole('button',{name:N.col}).click();await p.waitForTimeout(500);
let t=await L.body(p);r.colNote=t.split('\n').filter(l=>N.note.test(l)&&!/^(Kolinearna mesta|Collinear sites)$/.test(l)).map(l=>l.slice(0,220));
await p.getByRole('button',{name:N.cocirc}).click();await p.waitForTimeout(500);
t=await L.body(p);r.cocNote=t.split('\n').filter(l=>/krožnic|cocircular|degree|stopnj|četrt|four/i.test(l)).map(l=>l.slice(0,220)).slice(0,5);
// live region check
await p.getByRole('button',{name:sl?'Primer A–D':'Example A–D'}).click();await p.waitForTimeout(400);
r.live=await p.$$eval('[aria-live],[role=status]',e=>e.map(x=>x.innerText.slice(0,80)));
// keyboard move of D: click on D on board then arrows
await p.mouse.click(476,681);await p.waitForTimeout(300);
const xin=sl?'Točka 4: x':'Point 4: x',yin=sl?'Točka 4: y':'Point 4: y';
const dv=async()=>[await p.inputValue(`input[aria-label="${xin}"]`),await p.inputValue(`input[aria-label="${yin}"]`)];
r.kbBefore=await dv();r.focus=await p.evaluate(()=>document.activeElement.tagName+'|'+(document.activeElement.getAttribute('aria-label')||document.activeElement.className||'').toString().slice(0,60));
for(let i=0;i<2;i++){await p.keyboard.press('ArrowRight');}await p.keyboard.press('ArrowUp');await p.waitForTimeout(300);r.kbAfter=await dv();
// drag D onto B (-4,3) pixel: x=476-4*31.7=349, y=586-3*31.8=491
await p.mouse.move(476,681);await p.mouse.down();await p.mouse.move(420,600,{steps:6});await p.mouse.move(349,491,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
t=await L.body(p);r.ontoDrag={d:await dv(),msgs:t.split('\n').filter(l=>/enaki|coincide|isti|same/i.test(l)).slice(0,3)};
await p.screenshot({path:`c6-${lang}-ontodrag.png`});
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c6.json',JSON.stringify(out,null,1))})();
