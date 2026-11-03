const L=require('./lib');
(async()=>{const {b,p}=await L.open('en');
await p.getByRole('button',{name:'Play',exact:true}).click();const log=[];
for(let i=0;i<8;i++){await p.waitForTimeout(1500);log.push([(await L.body(p)).match(/Step \d+ of \d+/)[0],(await p.$$eval('button',bs=>bs.map(b=>b.innerText.trim()).filter(x=>/^(Pause|Play)$/.test(x)))).join()])}
console.log(JSON.stringify(log),p.errs);
// pause mid
await p.getByRole('button',{name:'Reset',exact:true}).first().click();await p.waitForTimeout(300);
await p.getByRole('button',{name:'Play',exact:true}).click();await p.waitForTimeout(1300);
await p.getByRole('button',{name:'Pause',exact:true}).click();const s1=await L.step(p);await p.waitForTimeout(2500);console.log('pause',s1,await L.step(p));
await b.close()})();
