const {chromium}=require('playwright');
setTimeout(()=>process.exit(2),150000).unref();
(async()=>{const br=await chromium.launch();try{
const ctx=await br.newContext({viewport:{width:1440,height:900}});
for(const r of process.argv.slice(2)){
const p=await ctx.newPage();
p.on('console',m=>m.type()==='error'&&console.log('ERR',m.text()));p.on('pageerror',e=>console.log('PERR',e.message));
await p.goto('http://127.0.0.1:4471/bezeg-2.0/'+r);await p.waitForTimeout(3500);
console.log('=== '+r);
console.log(await p.evaluate(()=>[...document.querySelectorAll('button,select,input,[role=switch]')].filter(e=>e.offsetParent).map(e=>e.tagName[0]+(e.type?':'+e.type:'')+'#'+e.id+'|'+(e.getAttribute('aria-label')||e.innerText||e.value||'').slice(0,28).replace(/\n/g,' ')).join(' ;; ')));
await p.close();}
}finally{await br.close()}})();
