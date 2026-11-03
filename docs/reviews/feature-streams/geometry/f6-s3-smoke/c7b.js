const L=require('./lib');const fs=require('fs');
(async()=>{const out={};
for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const sl=lang==='sl';const r={};
r.label=await p.$eval('div[tabindex="0"]',e=>e.getAttribute('aria-label'));
const xin=sl?'Točka 4: x':'Point 4: x',yin=sl?'Točka 4: y':'Point 4: y';
const dv=async()=>[await p.inputValue(`input[aria-label="${xin}"]`),await p.inputValue(`input[aria-label="${yin}"]`)];
await p.focus('div[tabindex="0"]');await p.keyboard.press('Tab').catch(()=>{});
await p.focus('div[tabindex="0"]');
// try selecting point 4 then arrows with board focus
await p.getByRole('button',{name:sl?/Izberi točko 4/:/Select point 4/}).click();await p.focus('div[tabindex="0"]');
r.sel=(await L.body(p)).match(/(?:Izbrana točka|Selected point)[^\n]*/)?.[0];
for(let i=0;i<3;i++)await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowUp');await p.waitForTimeout(300);
r.kbMove=await dv();
await p.evaluate(()=>window.scrollTo(0,0));
for(const k of ['SVG','PNG']){await p.getByRole('button',{name:sl?'Shrani':'Save',exact:true}).first().click();await p.waitForTimeout(300);
 await p.getByRole('button',{name:k,exact:true}).scrollIntoViewIfNeeded();
 const dl=p.waitForEvent('download',{timeout:10000}).catch(e=>null);await p.getByRole('button',{name:k,exact:true}).click();const d=await dl;
 if(!d){r['exp'+k]='no download';r['status'+k]=(await L.body(p)).split('\n').filter(l=>/izvoz|export|napaka|error|SVG|PNG/i.test(l)).slice(0,4);continue}
 const f=`export-${lang}.${k.toLowerCase()}`;await d.saveAs(f);const buf=fs.readFileSync(f);r['exp'+k]={name:d.suggestedFilename(),size:buf.length,head:k==='PNG'?buf.slice(0,8).toString('hex'):buf.slice(0,80).toString('utf8').replace(/\s+/g,' ')}}
r.errs=p.errs;out[lang]=r;await b.close()}
fs.writeFileSync('c7b.json',JSON.stringify(out,null,1))})();
