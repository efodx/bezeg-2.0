const L=require('./lib');const fs=require('fs');
(async()=>{for(const lang of ['sl','en']){const {b,p}=await L.open(lang);const sl=lang==='sl';
for(let i=0;i<5;i++){await p.locator('[data-action=next-step]').click();await p.waitForTimeout(200)}
const s=await L.step(p);await p.getByRole('button',{name:sl?'Shrani':'Save',exact:true}).first().click();await p.waitForTimeout(300);const o={s};
for(const k of ['SVG','PNG']){const dl=p.waitForEvent('download',{timeout:10000}).catch(()=>null);await p.getByRole('button',{name:k,exact:true}).click();const d=await dl;if(!d){o[k]='none';continue}const f=`mid-${lang}.${k.toLowerCase()}`;await d.saveAs(f);const buf=fs.readFileSync(f);o[k]={size:buf.length,sig:k==='PNG'?buf.slice(0,8).toString('hex'):'',path:k==='SVG'?(buf.toString().match(/<path/g)||[]).length:''}}
console.log(lang,JSON.stringify(o),p.errs.length);await b.close()}})();
