const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const sl=lang==='sl';const r={};
await p.getByRole('button',{name:sl?'Kolinearna mesta':'Collinear sites'}).click();await p.waitForTimeout(400);
for(let k=0;k<7;k++){const bt=p.locator('[data-action=next-step]');if(await bt.getAttribute('aria-disabled')==='true')break;await bt.click();await p.waitForTimeout(150)}
await p.evaluate(()=>window.scrollTo(0,0));
r.svgText=await p.$$eval('svg text, .JXG_board text, [class*=jxg] div',e=>e.map(x=>(x.textContent||'').trim()).filter(x=>x.length>6).slice(0,8));
r.status=await p.$$eval('[aria-live],[role=status],[role=note]',e=>e.map(x=>x.innerText.slice(0,200)));
await p.screenshot({path:`c5-${lang}-collinear-top.png`});
await p.getByRole('button',{name:sl?'Primer A–D':'Example A–D'}).click();await p.waitForTimeout(400);await p.evaluate(()=>window.scrollTo(0,0));
const xin=sl?'Točka 4: x':'Point 4: x',yin=sl?'Točka 4: y':'Point 4: y';
const dv=async()=>[await p.inputValue(`input[aria-label="${xin}"]`),await p.inputValue(`input[aria-label="${yin}"]`)];
await p.getByRole('button',{name:sl?/Izberi točko 4/:/Select point 4/}).click();await p.waitForTimeout(200);r.kbBefore=await dv();r.focus=await p.evaluate(()=>document.activeElement.tagName+'|'+(document.activeElement.getAttribute('aria-label')||'').slice(0,40));
for(let i=0;i<2;i++)await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowUp');await p.waitForTimeout(300);r.kbAfter=await dv();
await p.evaluate(()=>window.scrollTo(0,0));
await p.getByRole('button',{name:sl?'Primer A–D':'Example A–D'}).click();await p.waitForTimeout(400);await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);
await p.mouse.move(476,681);await p.mouse.down();await p.mouse.move(420,600,{steps:6});await p.mouse.move(349,491,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
const t=await L.body(p);r.ontoDrag={d:await dv(),msgs:t.split('\n').filter(l=>/enaki|coincide|premakni|move one|isti/i.test(l)).slice(0,3)};
await p.screenshot({path:`c6-${lang}-ontodrag.png`});
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c6b.json',JSON.stringify(out,null,1))})();
