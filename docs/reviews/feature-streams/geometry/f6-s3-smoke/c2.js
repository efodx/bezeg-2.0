const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const N=lang==='sl'?{next:'Naslednji korak',play:'Predvajaj',pause:'Premor',reset:'Ponastavi',cur:'Trenutni dogodek'}:{next:'Next step',play:'Play',pause:'Pause',reset:'Reset',cur:'Current event'};
const r={steps:[]};
const info=async()=>{const t=await L.body(p);const i=t.indexOf(N.cur);return {s:await L.step(p),cur:i>=0?t.slice(Math.max(0,i-5),i+110).replace(/\n/g,' | '):null,curCount:t.split(N.cur).length-1}};
r.steps.push(await info());
const tot=r.steps[0].s[1];
for(let i=1;i<tot+1;i++){await p.click(`button:has-text("${N.next}")`).catch(()=>{});await p.waitForTimeout(250);const x=await info();r.steps.push(x);
 if(x.cur&&!r.shot1&&/mesto|site/i.test(x.cur)||0){} }
fs.writeFileSync(`c2-${lang}-steps.json`,JSON.stringify(r,null,1));
// screenshots: find first site step (step2) and first circle step by text
await p.click(`button:has-text("${N.reset}")`);await p.waitForTimeout(300);
r.afterReset=await info();
await p.click(`button:has-text("${N.next}")`);await p.waitForTimeout(400);await p.screenshot({path:`c3-${lang}-site-step2.png`});
// find circle step
let found=null;for(let i=2;i<=tot;i++){await p.click(`button:has-text("${N.next}")`).catch(()=>{});await p.waitForTimeout(250);const t=await L.body(p);const k=t.indexOf(N.cur);if(k>=0&&/krog|circle|oglišč|vertex/i.test(t.slice(k,k+160))){found=i;await p.screenshot({path:`c3-${lang}-circle-step${i+0}.png`});r.circleText=t.slice(k,k+160).replace(/\n/g,' | ');break}}
r.circleStepIdx=found;
// play/pause
await p.click(`button:has-text("${N.reset}")`);await p.waitForTimeout(300);
await p.click(`button:has-text("${N.play}")`);await p.waitForTimeout(600);
r.playLabel=await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(t=>/Premor|Pause|Predvajaj|Play|Ustavi|Stop/.test(t)));
const s1=await L.step(p);await p.waitForTimeout(25000);r.afterPlay=await info();r.afterPlayLabel=await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(t=>/Premor|Pause|Predvajaj|Play|Ustavi|Stop/.test(t)));
await p.waitForTimeout(3000);r.afterPlay2=await L.step(p);r.midPlay=s1;
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c2.json',JSON.stringify(out,null,1))})();
