const {chromium}=require('playwright');
setTimeout(()=>process.exit(2),240000).unref();
const OUT=__dirname,URL='http://localhost:4320/bezeg-2.0/harness/collision-playground';
const log=(...a)=>console.log(...a);
function lum(c){const v=c.map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]}
(async()=>{const br=await chromium.launch();
try{for(const [name,vp,mobile] of [['desk',{width:1440,height:900},false],['mob',{width:390,height:844},true]])
for(const lang of ['sl','en']){
 const ctx=await br.newContext({viewport:vp,hasTouch:mobile,isMobile:mobile});
 await ctx.addInitScript(l=>localStorage.setItem('bezeg-2.0:bezeg-language',l),lang);
 const errs=[];const p=await ctx.newPage();p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push('PE '+e.message));
 const tag=`${name}-${lang}`;
 const S=p.locator('section.collision-inspect');
 const btns=S.locator('.collision-playground__buttons button');
 const live=async()=>(await S.locator('[data-testid=inspect-live]').textContent()).trim();
 const sweepX=async()=>await S.locator('[data-testid=inspect-sweep]').count()?await S.locator('[data-testid=inspect-sweep]').getAttribute('x1'):null;
 const act=async()=>await S.locator('[data-testid=inspect-active] li').count();
 for(const n of (lang==='sl'?[20,40]:[40])){
  await p.goto(URL+'?inspectCount='+n);await p.waitForSelector('[data-testid=inspect-world]');
  const prev=btns.nth(0),next=btns.nth(1);
  log(`== ${tag} n=${n} initial: prevDis=${await prev.isDisabled()} nextDis=${await next.isDisabled()} sweep=${await sweepX()} live="${await live()}"`);
  const k=Math.floor(n*0.9);
  for(let i=0;i<k;i++){await next.click()}
  await S.scrollIntoViewIfNeeded();await S.screenshot({path:`${OUT}/${tag}-n${n}-mid.png`});
  log(`${tag} n=${n} after ${k} next: sweep=${await sweepX()} active=${await act()} live="${(await live()).slice(0,60)}"`);
  await prev.click();log(`${tag} prev: sweep=${await sweepX()} active=${await act()} prevDis=${await prev.isDisabled()}`);
  if(n===40){
   let guard=0;while(!(await next.isDisabled())&&guard++<400)await next.click();
   const c=await S.evaluate(s=>({passLines:s.querySelectorAll('svg[data-testid=inspect-world] line[data-kind=pass]').length,rejLines:s.querySelectorAll('svg[data-testid=inspect-world] line[data-kind=reject]').length,passDash:[...s.querySelectorAll('line[data-kind=pass]')].map(l=>l.getAttribute('stroke-dasharray'))[0],rejDash:[...s.querySelectorAll('line[data-kind=reject]')].map(l=>l.getAttribute('stroke-dasharray'))[0],rejWithDash:[...s.querySelectorAll('line[data-kind=reject]')].filter(l=>l.getAttribute('stroke-dasharray')).length}));
   log(`${tag} end: nextDis=${await next.isDisabled()} lines`,JSON.stringify(c),'caption:',(await S.locator('[data-testid=inspect-caption]').textContent()).slice(0,90));
   await S.screenshot({path:`${OUT}/${tag}-n40-end.png`});
   await p.goto(URL+'?inspectCount=40');await p.waitForSelector('[data-testid=inspect-world]');
   for(let i=0;i<36;i++)await next.click();
   const ov=await S.evaluate(s=>{const box=(e,t)=>{const r=e.getBoundingClientRect();return {t,x:r.x,y:r.y,r:r.right,b:r.bottom}};
     const t=[...s.querySelectorAll('text')].map(e=>box(e,'svg:'+e.textContent));
     const li=[...s.querySelectorAll('[data-testid=inspect-active] li')].map(e=>box(e,'li:'+e.textContent.slice(0,12)));
     const all=[...t,...li];const o=[];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j];const w=Math.min(a.r,b.r)-Math.max(a.x,b.x),h=Math.min(a.b,b.b)-Math.max(a.y,b.y);if(w>0.5&&h>0.5)o.push(a.t+'|'+b.t+' '+w.toFixed(1)+'x'+h.toFixed(1))}
     return {texts:t.length,lis:li.length,n:o.length,overlaps:o.slice(0,8)}});
   log(`${tag} overlap`,JSON.stringify(ov));
   const cs=await S.evaluate(s=>{const res=[];const sel=['text.collision-inspect__label','.collision-inspect__event','.collision-inspect__active h4','.collision-inspect__active li','.collision-inspect__legend li','[data-testid=inspect-caption]','.collision-inspect__title'];
     for(const q of sel){const e=s.querySelector(q);if(!e)continue;const cst=getComputedStyle(e);let bg=null,el=e;while(el){const b=getComputedStyle(el).backgroundColor;if(b&&!/, 0\)$|transparent/.test(b)){bg=b;break}el=el.parentElement}res.push([q,e instanceof SVGElement?cst.fill:cst.color,bg||'none',cst.opacity])}return res});
   for(const [q,fg,bg,op] of cs){const pr=x=>(x.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
     const f=pr(fg),b=bg==='none'?[255,255,255]:pr(bg);const L1=lum(f),L2=lum(b);const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);log(`${tag} contrast ${q} fg=${fg} bg=${bg} op=${op} ratio=${cr.toFixed(2)}`)}
  }
 }
 await p.goto(URL);await p.waitForSelector('[data-testid=inspect-world]');
 const l0=await live();await p.waitForTimeout(1500);log(`${tag} live quiet: "${l0.slice(0,40)}" -> "${(await live()).slice(0,40)}"`);
 await S.evaluate(s=>{window.__m=0;new MutationObserver(m=>{window.__m+=m.length}).observe(s.querySelector('[data-testid=inspect-live]'),{childList:true,characterData:true,subtree:true})});
 const counts=[];for(const i of [1,1,0]){await btns.nth(i).click();await p.waitForTimeout(100);counts.push(await p.evaluate(()=>window.__m))}
 log(`${tag} live mutation cumulative after Next,Next,Prev: ${counts.join(',')}; text="${(await live()).slice(0,60)}"`);
 if(!mobile){
  const getN=async()=>(await S.locator('[data-testid=inspect-caption]').textContent()).match(/n = (\d+)/)?.[1];
  const foc=async()=>p.evaluate(()=>{const e=document.activeElement;return e.tagName+':'+(e.type||'')+':'+(e.getAttribute('aria-label')||e.textContent||'').slice(0,18)});
  await p.goto(URL);await p.waitForSelector('[data-testid=inspect-world]');
  await S.locator('input').first().focus();
  log(`${tag} kbd focus first input: ${await foc()} n=${await getN()} inputs=${await S.locator('input').count()}`);
  await p.keyboard.press('ArrowRight');log(`  ArrowRight -> n=${await getN()}`);
  await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowLeft');log(`  Left,Left -> n=${await getN()}`);
  await p.keyboard.press('ArrowUp');log(`  ArrowUp -> n=${await getN()}`);
  await p.keyboard.press('ArrowDown');log(`  ArrowDown -> n=${await getN()}`);
  const seq=[];for(let i=0;i<6;i++){await p.keyboard.press('Tab');seq.push(await foc())}log(`  tab seq: ${seq.join(' | ')}`);
  const ev=async()=>(await S.locator('[data-testid=inspect-event]').textContent()).slice(0,12);
  await btns.nth(1).focus();const e0=await ev();await p.keyboard.press('Enter');const e1=await ev();await p.keyboard.press('Space');const e2=await ev();
  await btns.nth(0).focus();await p.keyboard.press('Enter');const e3=await ev();await p.keyboard.press('Space');const e4=await ev();
  log(`  progress: ${e0} -Enter(Next)-> ${e1} -Space(Next)-> ${e2} -Enter(Prev)-> ${e3} -Space(Prev)-> ${e4}`);
  const w=S.locator('[data-testid=inspect-world]');
  await btns.nth(2).click();await p.waitForTimeout(300);const s1=await w.screenshot({path:`${OUT}/${tag}-play1.png`});await p.waitForTimeout(700);const s2=await w.screenshot({path:`${OUT}/${tag}-play2.png`});
  log(`  play: pressed=${await btns.nth(2).getAttribute('aria-pressed')} differ=${!s1.equals(s2)} nextDisabled=${await btns.nth(1).isDisabled()} text="${await btns.nth(2).textContent()}"`);
  await btns.nth(2).click();await p.waitForTimeout(200);const s3=await w.screenshot();await p.waitForTimeout(700);const s4=await w.screenshot();
  log(`  pause: pressed=${await btns.nth(2).getAttribute('aria-pressed')} differ=${!s3.equals(s4)}`);
 } else {
  const m=await p.evaluate(()=>{const S=document.querySelector('section.collision-inspect');const r=[...S.querySelectorAll('button,input')].map(e=>{const b=e.getBoundingClientRect();return [e.tagName+(e.type?':'+e.type:''),(e.textContent||'').slice(0,14),Math.round(b.width),Math.round(b.height)]});return {r,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bsw:document.body.scrollWidth,pointer:matchMedia('(pointer:coarse)').matches}});
  log(`${tag} touch targets`,JSON.stringify(m.r),`scrollW=${m.sw} clientW=${m.cw} bodyScrollW=${m.bsw} coarse=${m.pointer}`);
  const w=S.locator('[data-testid=inspect-world]');await btns.nth(2).tap();await p.waitForTimeout(300);const s1=await w.screenshot();await p.waitForTimeout(700);const s2=await w.screenshot();log(`  play frames differ=${!s1.equals(s2)}`);await btns.nth(2).tap();
 }
 log(`${tag} errors:`,JSON.stringify(errs));await ctx.close();
}}catch(e){log('SCRIPT FAIL',e.message)}finally{await br.close()}})();
