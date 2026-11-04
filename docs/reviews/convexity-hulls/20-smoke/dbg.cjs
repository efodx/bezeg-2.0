const {chromium}=require('../../../../node_modules/playwright');
setTimeout(()=>process.exit(2),60000).unref();
(async()=>{const b=await chromium.launch();try{
const p=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
await p.goto('http://127.0.0.1:4391/bezeg-2.0/compgeo/point-in-polygon');await p.waitForSelector('#jgbox');await p.waitForTimeout(1500);
await p.locator('button',{hasText:/^Uredi$/}).click();await p.waitForTimeout(300);
console.log(await p.evaluate(()=>[...document.querySelectorAll('button,[role=button]')].filter(e=>/\bq\b/.test((e.getAttribute('aria-label')||'')+e.innerText)).map(e=>e.outerHTML.slice(0,250))));
}finally{await b.close()}})();
