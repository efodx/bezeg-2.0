setTimeout(()=>process.exit(2),120000).unref();
const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const fs=require('fs');const U='http://localhost:4313/bezeg-2.0/';const O='docs/reviews/triangulation-voronoi/22h-browser/';
const A=require('path').resolve(O);
(async()=>{const b=await chromium.launch();try{
const p=await (await b.newContext({viewport:{width:1400,height:900},acceptDownloads:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(U+'compgeo/voronoi');await p.waitForTimeout(2500);
await p.click('button:has-text("Shrani")');await p.click('button[aria-label="Shrani prednastavitev"]');
await p.fill('input[type=text]:visible','smokeold');await p.click('[role=dialog] button:text-is("Shrani"),dialog button:text-is("Shrani")');await p.waitForTimeout(500);
const dl=p.waitForEvent('download',{timeout:8000});await p.click('button[aria-label="Izvozi prednastavitve"]');
(await dl).saveAs(A+'/export.json');await p.waitForTimeout(500);
const j=JSON.parse(fs.readFileSync(A+'/export.json','utf8'));console.log(JSON.stringify(j).slice(0,900));
function strip(o){if(o&&typeof o==='object'){if(o.overlays&&'diagram' in o.overlays){delete o.overlays.diagram;console.log('deleted');}for(const k in o)strip(o[k]);}}
strip(j);fs.writeFileSync(A+'/old.json',JSON.stringify(j));
await p.close();
const p2=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
await p2.goto(U+'compgeo/voronoi');await p2.waitForTimeout(2500);
await p2.click('button:has-text("Shrani")');await p2.waitForTimeout(500);
await p2.getByText('Uvozi prednastavitve').click();await p2.waitForSelector('input[type=file]');await p2.setInputFiles('input[type=file]',A+'/old.json');await p2.waitForTimeout(1000);await p2.getByRole('button',{name:'Uvozi',exact:true}).click();await p2.waitForTimeout(1000);
await p2.screenshot({path:A+'/imp1.png'});
console.log('opts',await p2.evaluate(()=>[...document.querySelectorAll('select option')].map(o=>o.textContent).join('|')));await p2.selectOption('select[aria-label="Prednastavitve"]',{label:'smokeold'});await p2.waitForTimeout(1500);console.log('stored',await p2.evaluate(()=>JSON.stringify(Object.values(localStorage)).slice(0,300)));await p2.screenshot({path:A+'/imp2.png'});
}finally{await b.close()}})();
