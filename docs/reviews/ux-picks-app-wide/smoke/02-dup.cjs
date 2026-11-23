const {chromium}=require('playwright');
setTimeout(()=>process.exit(2),60000).unref();
(async()=>{const br=await chromium.launch();try{
const p=await (await br.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto('http://127.0.0.1:4471/bezeg-2.0/linear-map');await p.waitForTimeout(3000);
await p.locator('select.form-select').filter({has:p.locator('option[value=basis]')}).selectOption('determinant');await p.waitForTimeout(800);
console.log(await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/Determinanta je pozitivna/.test(e.textContent)).map(e=>e.tagName+'.'+e.className+' role='+e.getAttribute('role')+' live='+e.getAttribute('aria-live')+' parent='+e.parentElement.className+' vis='+(e.offsetParent?1:0)+' w='+e.getBoundingClientRect().width).join('\n')));
}finally{await br.close()}})();
