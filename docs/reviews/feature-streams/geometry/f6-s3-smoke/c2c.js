const L=require('./lib');
(async()=>{const {b,p}=await L.open('en');
await p.click('button:has-text("Next step")');await p.waitForTimeout(300);
const g=async w=>console.log(w,JSON.stringify((await L.body(p)).match(/.{0,30}(Step|step) \d+.{0,30}/g)));
await g('after next');
await p.click('button:has-text("Reset")');await p.waitForTimeout(500);await g('after reset');
console.log((await L.body(p)).slice(0,600).replace(/\n/g,'|'));await p.screenshot({path:'c2c.png'});await b.close()})();
