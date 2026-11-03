const {chromium}=require(require.resolve('playwright',{paths:['C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry']}));
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1280,height:720}});
await c.addInitScript(()=>localStorage.setItem('bezeg-2.0:bezeg-language','sl'));
const p=await c.newPage();await p.goto('http://127.0.0.1:4323/bezeg-2.0/compgeo/fortune');await p.waitForTimeout(7000);
const o=await p.evaluate(()=>({btns:[...document.querySelectorAll('button,a,[role=button],input,select')].map(e=>(e.tagName+'|'+(e.getAttribute('aria-label')||'')+'|'+(e.innerText||e.value||'').slice(0,40).replace(/\n/g,' '))),text:document.body.innerText.slice(0,2500)}));
console.log(JSON.stringify(o,null,1));await p.screenshot({path:'probe.png'});await b.close()})();
