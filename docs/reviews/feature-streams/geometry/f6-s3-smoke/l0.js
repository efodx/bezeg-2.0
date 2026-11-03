const L=require('./lib');(async()=>{const {b,p}=await L.open(process.argv[2]||'sl',{width:1280,height:720},L.U+'?learn=1');await p.waitForTimeout(2000);
console.log(p.url());console.log(await p.$$eval('button,a',e=>e.map(x=>(x.dataset.action||'')+':'+x.innerText.trim().replace(/\n/g,' ').slice(0,30)).filter(x=>x.length>1).join(' ; ')));
console.log((await L.body(p)).slice(0,1200).replace(/\n+/g,'|'));await p.screenshot({path:'l0.png'});await b.close()})();
