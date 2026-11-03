const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const r={};
const t=await L.body(p);r.stepText=(t.match(/(?:Korak|Step) \d+ (?:od|of) \d+/)||[])[0];r.queue=(t.match(/▸[^\n]*/)||[])[0];
r.btns=await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(0,40));
r.queueSection=t.slice(t.search(/Vrsta dogodkov|Event queue/i),t.search(/Vrsta dogodkov|Event queue/i)+250);
await p.screenshot({path:`c1-${lang}.png`});
await p.reload();await p.waitForTimeout(3500);const t2=await L.body(p);r.reloadSame=(t2.match(/(?:Korak|Step) \d+ (?:od|of) \d+/)||[])[0]===r.stepText&&t2.includes('▸');
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c1.json',JSON.stringify(out,null,1))})();
