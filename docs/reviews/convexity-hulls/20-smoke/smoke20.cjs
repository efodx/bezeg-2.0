const {chromium}=require('../../../../node_modules/playwright');
const OUT=__dirname;
const BASE='http://127.0.0.1:4391/bezeg-2.0';
setTimeout(()=>{console.log('DEADLINE');process.exit(2)},280000).unref();
const log=(...a)=>console.log(...a);
const errs=[];
const TAB={edit:/^(Uredi|Edit)$/,view:/^(Prikaz|View|Display)$/,save:/^(Shrani|Save)$/};
async function open(ctx,route,lang){
  const p=await ctx.newPage();
  p.on('console',m=>{if(m.type()==='error')errs.push(route+' console: '+m.text().slice(0,200))});
  p.on('pageerror',e=>errs.push(route+' pageerror: '+String(e).slice(0,200)));
  p.on('dialog',d=>d.dismiss());
  await p.goto(BASE+'/compgeo/'+route);
  await p.waitForSelector('#bezeg-language',{timeout:20000});
  await p.waitForSelector('#jgbox',{timeout:20000});
  if(lang) await p.selectOption('#bezeg-language',lang);
  return p;
}
const tab=async(p,k)=>{await p.locator('button',{hasText:TAB[k]}).first().click();await p.waitForTimeout(250)};
const panel=async p=>(await p.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(b=>/^(Strni|Collapse)$/.test(b.innerText.trim()));let n=e;while(n&&!(n.innerText.length>300))n=n.parentElement;return n?n.innerText:''})).replace(/\n+/g,' | ');
const grab=async(p,re)=>{const t=await panel(p);const m=t.match(re);return m?m[0]:('NOMATCH: '+t.slice(0,200))};
const qget=(p,ax)=>p.evaluate(ax=>{const e=[...document.querySelectorAll('input[type=number]')].find(e=>new RegExp('\\bq\\b.*\\b'+ax+'$').test(e.getAttribute('aria-label')||''));return e?e.value:null},ax);
const setNum=(p,src,v)=>p.evaluate(([src,v])=>{const re=new RegExp(src,'i');const e=[...document.querySelectorAll('input[type=number]')].find(e=>re.test(e.getAttribute('aria-label')||''));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('blur',{bubbles:true}))},[src,String(v)]);
const R={};
const rec=(k,ok,note)=>{R[k]={ok,note};log((ok?'PASS ':'FAIL ')+k+' :: '+note)};
async function step(k,fn){try{await fn()}catch(e){rec(k,false,'EXC '+String(e).slice(0,300))}}
const readoutRe=/(Točka q|Point q)[^|]*\|[^|]*\|[^|]*\|[^|]*/;
const stepRe=/(Korak|Step) \d+ (od|of) \d+/;
const cellRe=/(Izbrana celica|Selected cell)[^|]*/;
const ruleRe=/(Veljavno pravilo|Active rule|Current rule|Valid rule)[^|]*/;
async function savePreset(p,name){await tab(p,'save');await p.getByRole('button',{name:/^(Shrani prednastavitev|Save preset)$/}).click();const d=p.getByRole('dialog');await d.getByLabel(/Ime prednastavitve|Preset name/).fill(name);await d.getByRole('button',{name:/^(Shrani|Save)$/}).click();await p.waitForTimeout(500)}
(async()=>{
const b=await chromium.launch();
try{
const ctx=await b.newContext({viewport:{width:1400,height:1000}});
// ---- Item 1
for(const route of ['point-in-polygon','hull-robustness']){
 await step('1-route-'+route,async()=>{
  const cx=await b.newContext({viewport:{width:1400,height:1000}});const p=await open(cx,route,'sl');
  const h1=await p.locator('h1').first().innerText();
  await p.screenshot({path:`${OUT}/${route}-sl-direct.png`});
  await p.reload();await p.waitForSelector('#jgbox',{timeout:20000});
  const h1b=await p.locator('h1').first().innerText();
  await p.selectOption('#bezeg-language','en');await p.waitForTimeout(500);
  const h1c=await p.locator('h1').first().innerText();
  await p.screenshot({path:`${OUT}/${route}-en-live.png`});
  await p.reload();await p.waitForSelector('#jgbox',{timeout:20000});
  const lang=await p.inputValue('#bezeg-language');
  const h1d=await p.locator('h1').first().innerText();
  rec('1-route-'+route,!!h1&&h1===h1b&&h1c!==h1&&h1d===h1c,`SL h1="${h1}", after refresh="${h1b}", EN live="${h1c}", EN after refresh lang=${lang} h1="${h1d}"`);
  await p.close();
 });
}
for(const lang of ['sl','en']) await step('1-catalog-'+lang,async()=>{
  const p=await ctx.newPage();p.on('console',m=>{if(m.type()==='error')errs.push('catalog '+m.text().slice(0,200))});
  await p.goto(BASE+'/');await p.waitForSelector('#bezeg-language');await p.selectOption('#bezeg-language',lang);
  await p.goto(BASE+'/compgeo');await p.waitForTimeout(1500);
  let links=await p.evaluate(()=>[...document.querySelectorAll('a[href*="/compgeo/"]')].map(a=>a.getAttribute('href')));
  if(!links.length){await p.goto(BASE+'/demonstrations');await p.waitForTimeout(1500);links=await p.evaluate(()=>[...document.querySelectorAll('a[href*="/compgeo/"]')].map(a=>a.getAttribute('href')));}
  const order=[...new Set(links.map(l=>l.split('/').pop().split('?')[0]))];
  const i=order.indexOf('convex-hull'),j=order.indexOf('point-in-polygon'),k=order.indexOf('hull-robustness');
  await p.screenshot({path:`${OUT}/catalog-${lang}.png`,fullPage:true});
  rec('1-catalog-'+lang,i>=0&&j===i+1&&k===j+1,`url=${p.url()} order=${order.join(',')}`);
  await p.close();
});
// ---- Item 2
for(const lang of ['sl','en']) await step('2-kbd-'+lang,async()=>{
  const p=await open(ctx,'point-in-polygon',lang);await tab(p,'edit');
  await p.locator('button',{hasText:/(točko|point) q/i}).first().click();
  await p.locator('#jgbox').focus();
  const seq=[];const s0=await grab(p,readoutRe);seq.push('start: '+s0.slice(0,70));
  seq.push('q='+await qget(p,'x')+','+await qget(p,'y'));
  let changed=false;
  for(let n=1;n<=12;n++){await p.keyboard.press('ArrowRight');const t=await grab(p,readoutRe);if(t.slice(0,60)!==s0.slice(0,60)){changed=true;seq.push(`after ${n} ArrowRight: x=${await qget(p,'x')} ${t.slice(0,70)}`);break}}
  await p.screenshot({path:`${OUT}/pip-kbd-${lang}.png`});
  for(const k of ['ArrowUp','ArrowDown','ArrowLeft']) await p.keyboard.press(k);
  seq.push('after Up,Down,Left q='+await qget(p,'x')+','+await qget(p,'y'));
  const v=await p.evaluate(()=>[...document.querySelectorAll('input[type=number]')].filter(e=>/(Točka|Point) 1: [xy]$/.test(e.getAttribute('aria-label')||'')).map(e=>e.value));
  await setNum(p,'\\bq\\b.*\\bx$',v[0]);await setNum(p,'\\bq\\b.*\\by$',v[1]);await p.waitForTimeout(400);
  seq.push('q on P1='+v+' -> '+(await grab(p,readoutRe)).slice(0,70));
  await setNum(p,'\\bq\\b.*\\bx$',-5);await p.waitForTimeout(300);
  seq.push('x=-5 -> '+(await grab(p,readoutRe)).slice(0,70));
  log('['+lang+'] '+seq.join('\n   '));
  await p.close();
  rec('2-kbd-'+lang,changed,seq.join(' ; ').slice(0,600));
});
await step('2-ray',async()=>{
  const p=await open(ctx,'point-in-polygon','sl');await tab(p,'edit');
  const cb=p.locator('input[type=checkbox]').nth(2);
  const len=()=>p.evaluate(()=>document.querySelector('#jgbox svg').innerHTML.length);
  const h0=await len();
  const c0=await cb.isChecked();await cb.click({force:true});await p.waitForTimeout(400);
  const h1=await len();const c1=await cb.isChecked();
  await p.screenshot({path:`${OUT}/pip-ray-off.png`});
  await cb.click({force:true});await p.waitForTimeout(300);
  const h2=await len();
  const r1=await grab(p,readoutRe);await p.selectOption('#bezeg-language','en');await p.waitForTimeout(400);const r2=await grab(p,readoutRe);
  rec('2-ray',c0!==c1&&h0!==h1&&h2===h0,`checkbox ${c0}->${c1}, svg len ${h0}->${h1}->${h2}`);
  rec('2-readout-lang',r1.slice(0,40)!==r2.slice(0,40),`SL="${r1.slice(0,80)}" EN="${r2.slice(0,80)}"`);
  await p.close();
});
await ctx.close();
await step('2-touch',async()=>{
  const tctx=await b.newContext({viewport:{width:1400,height:1000},hasTouch:true});
  const p=await open(tctx,'point-in-polygon','sl');await tab(p,'edit');
  const cnt=async()=>(await panel(p)).match(/Točk: \d+ od največ \d+/)?.[0];
  const c0=await cnt();
  await p.locator('button',{hasText:/Dodajanje z dotikom|touch or click|touch/i}).first().click();await p.waitForTimeout(200);
  const bb=await p.locator('#jgbox').boundingBox();
  await p.touchscreen.tap(bb.x+bb.width*0.7,bb.y+bb.height*0.3);await p.waitForTimeout(500);
  const cEmpty=await cnt();
  const pts=await p.evaluate(()=>[...document.querySelectorAll('#jgbox svg ellipse,#jgbox svg circle')].map(e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}));
  await p.touchscreen.tap((pts[0][0]+pts[1][0])/2,(pts[0][1]+pts[1][1])/2);await p.waitForTimeout(500);
  const c1=await cnt();
  await p.screenshot({path:`${OUT}/pip-touch-add.png`});
  rec('2-touch',c0!==c1,`${c0} -> tap on empty board area ${cEmpty} -> tap near polygon ${c1}; ${(await grab(p,/(Večkotnik je|Polygon is)[^|]*/))}`);
  await tctx.close();
});
// ---- Item 3
for(const lang of ['sl','en']) await step('3-hull-'+lang,async()=>{
  const c=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await open(c,'hull-robustness',lang);await tab(p,'edit');
  const sels=p.locator('select:not(#bezeg-language)');const n=[];
  const NEXT=p.locator('button',{hasText:/^(Naslednji korak|Next step)$/});
  n.push('s0 '+await grab(p,stepRe));
  await NEXT.click();await NEXT.click();
  n.push('Next x2 '+await grab(p,stepRe));
  await p.locator('button',{hasText:/^(Predvajaj|Play)$/}).click();await p.waitForTimeout(2500);
  n.push('Play 2.5s '+await grab(p,stepRe));
  await p.screenshot({path:`${OUT}/hull-play-${lang}.png`});
  await p.locator('button',{hasText:/^(Ponastavi|Reset)$/}).and(p.locator('[data-action=reset]')).click();await p.waitForTimeout(200);
  n.push('Reset '+await grab(p,stepRe));
  await NEXT.click();
  await sels.nth(1).selectOption({index:1});await p.waitForTimeout(300);
  n.push('rule->1: '+await grab(p,stepRe)+' ; '+await grab(p,ruleRe));
  await sels.nth(2).selectOption({index:1});await p.waitForTimeout(300);
  n.push('dups->1: '+await grab(p,stepRe)+' ; '+await grab(p,ruleRe));
  await p.screenshot({path:`${OUT}/hull-rule-${lang}.png`});
  await sels.nth(0).selectOption('kettner');await p.waitForTimeout(800);
  const k0=await grab(p,/(Izbrana celica|Selected cell)[^|]*\|[^|]*\|[^|]*\|[^|]*/);
  n.push('kettner: '+k0.slice(0,200));
  await p.screenshot({path:`${OUT}/hull-kettner-${lang}.png`});
  const dflt=/41/.test(k0)&&/48/.test(k0)&&/(nenatančn|inexact)/i.test(k0);
  await p.mouse.click(333+6.33*10.5,884-6.33*10.5);await p.waitForTimeout(300);
  const k1=await grab(p,cellRe);n.push('click cell: '+k1);
  const m1=k1.match(/i = (\d+), j = (\d+)/);
  await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowUp');await p.waitForTimeout(300);
  const k2=await grab(p,cellRe);n.push('arrows R,R,U: '+k2);
  const m2=k2.match(/i = (\d+), j = (\d+)/);
  await p.screenshot({path:`${OUT}/hull-cell-${lang}.png`});
  await sels.nth(0).selectOption('chain');await p.waitForTimeout(600);
  n.push('back chain: '+await grab(p,stepRe));
  log('['+lang+'] '+n.join('\n   '));
  rec('3-hull-'+lang,!!(dflt&&m1&&m2&&+m1[1]===10&&+m1[2]===10&&+m2[1]===12&&+m2[2]===11),`default cell41,48+inexact label=${dflt}; click=${m1&&m1.slice(1)}; arrows=${m2&&m2.slice(1)}`);
  await c.close();
});
// ---- Item 4
await step('4-timing',async()=>{
  const c=await b.newContext({viewport:{width:1400,height:1000}});
  const p=await open(c,'hull-robustness','sl');await tab(p,'edit');
  await p.evaluate(()=>{window.__t0=null;const f=()=>{if(window.__t0===null)window.__t0=performance.now()};document.addEventListener('input',f,true);document.addEventListener('pointerdown',f,true);
    window.__measure=()=>new Promise(res=>{const box=document.querySelector('#jgbox');const lbl=window.__lbl;let done=false;let mo;const fin=()=>{if(done)return;done=true;mo.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>{res(performance.now()-window.__t0)}))};
      mo=new MutationObserver(()=>{if(box.getAttribute('aria-label')!==lbl)fin()});mo.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{if(!done){done=true;mo.disconnect();res(-1)}},4000)})});
  const sel=p.locator('select:not(#bezeg-language)').nth(0);
  const sw=[],cell=[];
  const arm=()=>p.evaluate(()=>{window.__t0=null;window.__lbl=document.querySelector('#jgbox').getAttribute('aria-label')});
  for(let r=0;r<5;r++){
    await arm();const pr=p.evaluate(()=>window.__measure());
    await sel.selectOption('kettner');sw.push(await pr);
    await p.waitForTimeout(500);
    const i=5+r*9,j=60-r*10;
    await arm();const pr2=p.evaluate(()=>window.__measure());
    await p.mouse.click(333+6.33*(i+.5),884-6.33*(j+.5));cell.push(await pr2);
    await p.waitForTimeout(500);
    await sel.selectOption('chain');await p.waitForTimeout(600);
  }
  const med=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
  const f=a=>a.map(x=>x.toFixed(0)).join(',');
  rec('4-timing',sw.every(x=>x>0)&&cell.every(x=>x>0),`switch median ${med(sw).toFixed(0)} max ${Math.max(...sw).toFixed(0)} ms [${f(sw)}]; cell median ${med(cell).toFixed(0)} max ${Math.max(...cell).toFixed(0)} ms [${f(cell)}] (headless Chromium 1400x1000; input event -> aria-label change -> 2 rAF; click includes pointer release)`);
  await c.close();
});
// ---- Item 5
for(const lang of ['sl','en']) await step('5-preset-pip-'+lang,async()=>{
  const c=await b.newContext({viewport:{width:1400,height:1000}});const p=await open(c,'point-in-polygon',lang);await tab(p,'edit');
  await setNum(p,'\\bq\\b.*\\bx$',-3);await setNum(p,'\\bq\\b.*\\by$',4);await p.waitForTimeout(300);
  const q1=[await qget(p,'x'),await qget(p,'y')];const ro1=(await grab(p,readoutRe)).slice(0,50);
  await savePreset(p,'smoke20-pip');
  await tab(p,'edit');await setNum(p,'\\bq\\b.*\\bx$',1);await setNum(p,'\\bq\\b.*\\by$',1);await p.waitForTimeout(300);
  const q2=[await qget(p,'x'),await qget(p,'y')];
  await tab(p,'save');await p.getByRole('combobox',{name:/Prednastavitve|Presets/}).selectOption('smoke20-pip');await p.waitForTimeout(600);
  await tab(p,'edit');const q3=[await qget(p,'x'),await qget(p,'y')];
  await p.screenshot({path:`${OUT}/pip-preset-${lang}.png`});
  rec('5-preset-pip-'+lang,q1.join()===q3.join()&&q2.join()!==q1.join(),`saved q=${q1} changed q=${q2} restored q=${q3}; readout ${ro1}`);
  await c.close();
});
for(const lang of ['sl','en']) await step('5-preset-hull-'+lang,async()=>{
  const c=await b.newContext({viewport:{width:1400,height:1000}});const p=await open(c,'hull-robustness',lang);await tab(p,'edit');
  const sels=p.locator('select:not(#bezeg-language)');
  await sels.nth(1).selectOption({index:1});await sels.nth(2).selectOption({index:1});
  await sels.nth(0).selectOption('kettner');await p.waitForTimeout(500);
  await p.getByLabel(/indeks i|index i/i).fill('20');await p.getByLabel(/indeks j|index j/i).fill('33');await p.getByLabel(/indeks j|index j/i).blur();await p.waitForTimeout(400);
  const cell1=await grab(p,cellRe);
  await savePreset(p,'smoke20-hull');
  await tab(p,'edit');await sels.nth(0).selectOption('chain');await p.waitForTimeout(300);
  await sels.nth(1).selectOption({index:0});await sels.nth(2).selectOption({index:0});await p.waitForTimeout(300);
  await tab(p,'save');await p.getByRole('combobox',{name:/Prednastavitve|Presets/}).selectOption('smoke20-hull');await p.waitForTimeout(700);
  await tab(p,'edit');
  const mode=await sels.nth(0).inputValue();const cell3=await grab(p,cellRe);
  await sels.nth(0).selectOption('chain');await p.waitForTimeout(400);
  const rule=await sels.nth(1).inputValue(),dup=await sels.nth(2).inputValue();
  const ruleOpts=await sels.nth(1).evaluate(s=>[...s.options].map(o=>o.value).join(','));
  const dupOpts=await sels.nth(2).evaluate(s=>[...s.options].map(o=>o.value).join(','));
  await p.screenshot({path:`${OUT}/hull-preset-${lang}.png`});
  rec('5-preset-hull-'+lang,mode==='kettner'&&/20/.test(cell3)&&/33/.test(cell3)&&rule===ruleOpts.split(',')[1]&&dup===dupOpts.split(',')[1],`saved: ${cell1.slice(0,40)}; restored mode=${mode} cell="${cell3.slice(0,40)}"; rule=${rule} (opts ${ruleOpts}) dup=${dup} (opts ${dupOpts})`);
  await c.close();
});
}finally{
 await b.close();
 log('CONSOLE ERRORS:',errs.length?errs.join('\n'):'none');
 require('fs').writeFileSync(OUT+'/results.json',JSON.stringify({R,errs},null,1));
 process.exit(0);
}})();
