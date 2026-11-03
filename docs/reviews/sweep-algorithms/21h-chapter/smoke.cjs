const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
const B='http://localhost:4313/bezeg-2.0';
(async()=>{
const br=await chromium.launch();const p=await br.newPage();const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(String(e)));
await p.goto(B+'/learn/sweep-algorithms');await p.waitForTimeout(2500);
const info=async()=>p.evaluate(()=>({h:[...document.querySelectorAll('section[id],[id^=monotone],[id^=interval],[id^=segment]')].map(e=>e.id+'|'+(e.querySelector('h2,h3')?.textContent||'').slice(0,60)),raw:document.body.innerText.includes('\\('),links:[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>/learn|lesson|#/.test(h||'')),lang:document.documentElement.lang}));
console.log('SL',JSON.stringify(await info(),null,1));
console.log('btns',await p.evaluate(()=>[...document.querySelectorAll('button,select,[role=combobox]')].map(b=>(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,30)).filter(Boolean).join(' ; ')));
console.log('errs',errs);
await br.close()})();
