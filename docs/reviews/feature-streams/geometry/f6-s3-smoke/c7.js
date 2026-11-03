const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const sl=lang==='sl';const r={tabs:[]};
const desc=()=>p.evaluate(()=>{const e=document.activeElement;const cs=getComputedStyle(e);return (e.tagName+'|'+(e.dataset.action||e.getAttribute('aria-label')||e.getAttribute('role')||e.innerText||'').toString().slice(0,28).replace(/\n/g,' ')+'|ol='+cs.outlineStyle+' '+cs.outlineWidth+'|bs='+(cs.boxShadow!=='none'?'y':'n'))});
for(let i=0;i<30;i++){await p.keyboard.press('Tab');const d=await desc();r.tabs.push(d);if(/next-step/.test(d))break}
r.s0=await L.step(p);await p.keyboard.press('Enter');await p.waitForTimeout(250);r.afterEnter=await L.step(p);
await p.keyboard.press('Space');await p.waitForTimeout(250);r.afterSpace=await L.step(p);
await p.screenshot({path:`c6-${lang}-focus.png`});
// does board take focus? continue tabbing
const more=[];for(let i=0;i<4;i++){await p.keyboard.press('Tab');more.push(await desc())}r.more=more;
// board focusable?
r.boardFocusable=await p.$$eval('[tabindex]',e=>e.map(x=>x.tagName+'.'+(x.className||'').toString().slice(0,30)+'='+x.getAttribute('tabindex')).slice(0,8));
// export
const mk=async(k)=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:15000}),p.getByRole('button',{name:k,exact:true}).click()]);const f=`export-${lang}.${k.toLowerCase()}`;await dl.saveAs(f);return f};
r.exp={};
for(const k of ['SVG','PNG']){try{await p.evaluate(()=>window.scrollTo(0,0));const f=await mk(k);const buf=fs.readFileSync(f);r.exp[k]={file:f,size:buf.length,sig:k==='PNG'?buf.slice(0,8).toString('hex'):buf.slice(0,60).toString('utf8').replace(/\s+/g,' ')}}catch(e){r.exp[k]='ERR '+e.message.slice(0,100)}}
r.expStep=await L.step(p);
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c7.json',JSON.stringify(out,null,1))})();
