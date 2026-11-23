const {chromium}=require('playwright');const fs=require('fs');
setTimeout(()=>process.exit(2),240000).unref();
const LOG=__dirname+'/02-publish.log';const L=s=>{fs.appendFileSync(LOG,s+'\n');console.log(s)};
(async()=>{const br=await chromium.launch();try{
const p=await (await br.newContext({viewport:{width:1440,height:900}})).newPage();
p.on('console',m=>m.type()==='error'&&L('CONSOLE-ERR '+m.text()));p.on('pageerror',e=>L('PAGEERR '+e.message));
for(const lang of ['EN']){
await p.goto('http://127.0.0.1:4471/bezeg-2.0/linear-map');await p.waitForTimeout(3000);if(lang==='SL'){}
if(lang==='EN'){await p.locator('#bezeg-language').selectOption('en');await p.waitForTimeout(1000);}
const vals=await p.evaluate(()=>[...document.querySelectorAll('select.form-select')].filter(s=>[...s.options].some(o=>o.value==='basis')).map(s=>[...s.options].map(o=>o.value)));
L(lang+' modes '+JSON.stringify(vals));
for(const v of vals[0]){
 await p.locator('select.form-select').filter({has:p.locator('option[value=basis]')}).selectOption(v);await p.waitForTimeout(900); try{await p.locator('select.form-select').first().selectOption({index:8});await p.waitForTimeout(700);}catch(e){L('exsel '+e.message.slice(0,80))}
 const t=await p.evaluate(()=>{const b=document.body.innerText;const i=b.search(/Odčitki|Readout|Reading/);return i<0?'NO READOUT HEADING':b.slice(i,i+900).replace(/\n/g,' ; ')});
 L(`${lang} [${v}] `+t);
 await p.screenshot({path:__dirname+`/02-linear-${lang}-${v}.png`});
}}
}finally{await br.close()}})();
