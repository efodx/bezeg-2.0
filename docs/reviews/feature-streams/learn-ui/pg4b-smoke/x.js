const L=require('./lib.js');(async()=>{const {br,page,errs}=await L.open();
await page.goto(L.B+'/learn/bezier-curves');await page.waitForTimeout(2500);
console.log(await page.locator('svg.playground__canvas').count(), await page.locator('.playground').evaluateAll(e=>e.map(x=>x.className+' | '+(x.closest('section')?.querySelector('h2,h3')?.textContent)+' | '+x.getBoundingClientRect().top)));
console.log(await page.locator('.playground button').allInnerTexts());
console.log(await page.locator('.lu-switch').allInnerTexts(), await page.locator('a[href*="spline"]').evaluateAll(a=>a.map(x=>x.href+x.textContent)));
console.log(errs);await br.close()})()
