const {chromium}=require(require.resolve('playwright',{paths:['C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry']}));
const U='http://127.0.0.1:4323/bezeg-2.0/compgeo/fortune';
exports.U=U;
exports.open=async(lang,vp={width:1280,height:720},url=U)=>{const b=await chromium.launch();const c=await b.newContext({viewport:vp,acceptDownloads:true});
await c.addInitScript(l=>localStorage.setItem('bezeg-2.0:bezeg-language',l),lang);
const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')p.errs.push('CE '+m.text())});
await p.goto(url);await p.waitForSelector('button:has-text("'+(lang==='sl'?'Naslednji korak':'Next step')+'")',{timeout:20000}).catch(()=>{});await p.waitForTimeout(1500);return {b,c,p}};
exports.body=p=>p.evaluate(()=>document.body.innerText);
exports.step=async p=>{const t=await p.evaluate(()=>document.body.innerText);const m=t.match(/(?:Korak|Step) (\d+) (?:od|of) (\d+)/);return m?[+m[1],+m[2]]:null};
