const {chromium}=require('../../../../node_modules/playwright');
setTimeout(()=>process.exit(2),90000).unref();
(async()=>{const b=await chromium.launch();try{
const p=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
p.on('dialog',d=>{console.log('DIALOG',d.type(),d.message());d.dismiss()});
await p.goto('http://127.0.0.1:4391/bezeg-2.0/compgeo/point-in-polygon');await p.waitForSelector('button:has-text("Shrani")',{timeout:20000});
await p.click('button:has-text("Shrani")');await p.waitForTimeout(400);
console.log(await p.evaluate(()=>[...document.querySelectorAll('[role=tabpanel],aside,[class*=ools]')].pop().innerText.replace(/\n/g,' | ')));
console.log(await p.evaluate(()=>[...document.querySelectorAll('button,select,input')].filter(e=>e.offsetParent&&e.closest('[class*=ools],aside')).map(e=>e.tagName+'|'+e.type+'|'+(e.getAttribute('aria-label')||e.innerText||e.value).slice(0,40)).join('\n')));
}finally{await b.close()}})();
