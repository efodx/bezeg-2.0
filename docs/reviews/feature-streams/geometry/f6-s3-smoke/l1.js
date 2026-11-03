const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang,{width:1280,height:720},L.U+'?learn=1');const sl=lang==='sl';const r={frames:[]};
const N=sl?{nx:'Naslednji okvir',pv:'Prejšnji okvir',back:'Nazaj v poglavje'}:{nx:'Next frame',pv:'Previous frame',back:'Return to chapter'};
await p.waitForTimeout(1500);
const frame=async()=>{const t=await L.body(p);const i=t.indexOf(sl?'Nazaj v poglavje':'Return to chapter');return {step:await L.step(p),url:p.url().split('?')[1]?.slice(0,80),txt:t.slice(i,i+330).replace(/\n+/g,'|'),ctr:(t.match(/(?:Okvir|Frame) \d+ (?:od|of) \d+|\d+ ?\/ ?\d+/)||[''])[0]}};
r.frames.push(await frame());
let n=0;let fail=0;
for(let i=0;i<60;i++){const bt=p.getByRole('button',{name:N.nx,exact:true});if(!(await bt.count()))break;if(await bt.getAttribute('aria-disabled')==='true'||await bt.isDisabled())break;await bt.click();await p.waitForTimeout(350);r.frames.push(await frame());n++;
 if(lang==='en'&&n===3){const f=r.frames[n];r.preSwitch=f;await p.selectOption('select','sl');await p.waitForTimeout(800);r.postSwitch=await frame();await p.selectOption('select','en');await p.waitForTimeout(800);r.back2en=await frame()}}
r.n=n;r.endStep=await L.step(p);r.nextCount=await p.getByRole('button',{name:N.nx,exact:true}).count();
await p.screenshot({path:`l1-${lang}-end.png`});
const bk=p.getByText(N.back,{exact:true}).first();await bk.click();await p.waitForTimeout(1500);r.afterBack=p.url();
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('l1.json',JSON.stringify(out,null,1))})();
