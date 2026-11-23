const {chromium}=require('playwright');const fs=require('fs');
setTimeout(()=>process.exit(2),200000).unref();
const L=s=>{fs.appendFileSync(__dirname+'/02-publish.log',s+'\n');console.log(s)};
(async()=>{const br=await chromium.launch();try{
const p=await (await br.newContext({viewport:{width:1440,height:900}})).newPage();
p.on('console',m=>m.type()==='error'&&L('CONSOLE-ERR '+m.text()));p.on('pageerror',e=>L('PAGEERR '+e.message));
await p.goto('http://127.0.0.1:4471/bezeg-2.0/analysis/phase-portrait');await p.waitForTimeout(3500);
const sel=p.locator('select#\\:r4\\:');
const info=()=>p.evaluate(()=>{const b=Object.values(JXG.boards)[0];const o=Object.values(b.objects);
 const texts=o.filter(x=>x.elType==='text'&&x.visPropCalc&&x.visPropCalc.visible).map(x=>x.plaintext||x.htmlStr||'').filter(t=>/ovije|wrap|π/.test(t));
 const wc=o.filter(x=>x.elType==='curve'&&x.visPropCalc&&x.visPropCalc.visible&&x.getAttribute('dash')>0).length;return JSON.stringify({dashedVisibleCurves:wc,wrapLegend:texts.length,t:texts.slice(0,2).map(s=>s.slice(0,60))})});
for(const v of ['linear','pendulum','weak-spiral']){
 await sel.selectOption(v);await p.waitForTimeout(1200);
 L('PHASE '+v+' initial '+await info());
 await p.getByRole('button',{name:'Predvajaj'}).click();await p.waitForTimeout(5000);
 L('PHASE '+v+' after play '+await info());
 await p.screenshot({path:__dirname+`/02-phase-${v}.png`});
 await p.getByRole('button',{name:'Ponastavi'}).first().click();await p.waitForTimeout(300);
}
// pendulum: add rotating seed (theta=0, omega=3) via the seed inputs
await sel.selectOption('pendulum');await p.waitForTimeout(800);
const ins=await p.evaluate(()=>[...document.querySelectorAll('input[type=text]')].filter(e=>e.offsetParent).map(e=>e.id+'='+e.value));L('inputs '+ins);
}finally{await br.close()}})();
