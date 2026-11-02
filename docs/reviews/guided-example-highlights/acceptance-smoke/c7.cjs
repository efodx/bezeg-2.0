const {chromium}=require('../../../../node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:4387/bezeg-2.0/demonstrations');await p.locator('select').first().selectOption('sl');await p.waitForTimeout(800);
for(const h of ['/bezeg-2.0/bezier/curve?learn=1','/bezeg-2.0/ph/cubic?learn=1']){
await p.goto('http://127.0.0.1:4387/bezeg-2.0/demonstrations');await p.waitForTimeout(800);
await p.locator(`a[href="${h}"]`).first().click();await p.waitForTimeout(2000);
const ls=await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.textContent.trim().slice(0,50)+' -> '+a.getAttribute('href')).filter(x=>/learn|primer|poglavje|example/i.test(x)));
console.log(h,'=>',p.url().replace(/.*bezeg-2.0/,''),ls.slice(0,6));
const a=p.locator('a[href*="/learn/"]').first();
if(await a.count()){await a.click();await p.waitForTimeout(1500);console.log(' follow ->',p.url().replace(/.*bezeg-2.0/,''),'targetInView',await p.evaluate(()=>{const e=document.getElementById(location.hash.slice(1));if(!e)return null;const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}))}}
await b.close()})()
