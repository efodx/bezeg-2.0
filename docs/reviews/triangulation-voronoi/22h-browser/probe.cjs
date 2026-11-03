setTimeout(()=>process.exit(2),90000).unref();
const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
(async()=>{const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:1400,height:900}});
await p.goto('http://localhost:4313/bezeg-2.0/compgeo/voronoi?learn=1');await p.waitForTimeout(2500);
const g=async()=>console.log(JSON.stringify(await p.evaluate(()=>{const l=document.querySelector('.guided-lesson');return {t:l.innerText.replace(/\n/g,' ').slice(0,100),prog:[...l.querySelectorAll('[aria-current],[role=progressbar],.guided-lesson-progress')].map(e=>e.className+':'+e.textContent.slice(0,40)),side:(document.body.innerText.match(/(oglišč|vertic)[^\n]*/gi)||[]).slice(0,4)}})));
await g();
for(let i=0;i<3;i++){await p.click('button[aria-label="Naslednji okvir"]');await p.waitForTimeout(500);await g();}
}finally{await b.close()}})();
