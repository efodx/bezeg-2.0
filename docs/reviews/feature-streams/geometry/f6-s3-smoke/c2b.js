const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const N=lang==='sl'?{next:'Naslednji korak',play:'Predvajaj',reset:'Ponastavi'}:{next:'Next step',play:'Play',reset:'Reset'};
const r={log:[]};
for(let i=0;i<5;i++){await p.click(`button:has-text("${N.next}")`);await p.waitForTimeout(250)}
await p.screenshot({path:`c3-${lang}-circle-step6.png`});
await p.click(`button:has-text("${N.reset}")`).catch(()=>{});await p.waitForTimeout(300);
await p.click(`button:has-text("${N.play}")`);
for(let i=0;i<14;i++){await p.waitForTimeout(2000);const t=await L.body(p);r.log.push([(t.match(/(?:Korak|Step) \d+ (?:od|of) \d+/)||['-'])[0],(await p.$$eval('button',bs=>bs.map(b=>b.innerText.trim()).filter(x=>/Premor|Pause|Predvajaj|Play/.test(x)))).join()])}
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c2b.json',JSON.stringify(out))})();
