const {chromium}=require('../../../../node_modules/playwright');
const fs=require('fs');
const B='http://127.0.0.1:4387/bezeg-2.0';const D=__dirname;
const CH=['bezier-curves','foundations','rational-curves','splines','ph-curves','parametrization','functions-and-calculus','analysis','bezier-patches','linear-maps','complex-maps','convexity-hulls','triangulations-voronoi'];
const R={};const log=(k,v)=>{R[k]=v;console.log(k,JSON.stringify(v))};
const errs=[];
const CARD='aside.chapter-exploration--guided-example';
const BOARD='.workspace-graph svg, .workspace-graph canvas';
const RET=/Nazaj v poglavje|Back to chapter|Return to chapter/i;
const waitImgs=`Promise.all([...document.querySelectorAll('img')].map(i=>{i.loading='eager';return i.complete?0:new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,5000)})}))`;
(async()=>{const b=await chromium.launch();
async function mk(w,h,dsf=1,lang='sl'){const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:dsf});const p=await c.newPage();
 p.on('console',m=>{if(m.type()==='error')errs.push(p.url()+' '+m.text())});p.on('pageerror',e=>errs.push(p.url()+' PE '+e.message));
 await p.goto(B+'/learn');
 await p.locator('select').first().selectOption(lang);await p.waitForTimeout(300);return p}
const cardInfo=p=>p.evaluate(async(wi)=>{
 await eval(wi);
 const cards=[...document.querySelectorAll('aside.chapter-exploration--guided-example')];
 const allFig=[...document.querySelectorAll('figure')].filter(f=>!f.closest('aside.chapter-exploration'));
 const tex=/\\\(|\\\)|\\frac|\\mathbf|\\\[|\\sqrt|\\cdot|\$\$/.test(document.body.innerText);
 return {n:cards.length,nonCardFigures:allFig.length,tex,
  bad:cards.map(c=>{const i=c.querySelector('img'),f=c.querySelector('figcaption');return {t:c.getAttribute('aria-label'),ok:!!i&&i.naturalWidth>0,alt:!!(i&&i.alt.trim()),cap:!!(f&&f.textContent.trim())}}).filter(x=>!x.ok||!x.alt||!x.cap),
  first:cards[0]?{alt:cards[0].querySelector('img')?.alt,cap:cards[0].querySelector('figcaption')?.textContent}:null}},waitImgs);
if(0){// check1
for(const lang of ['sl','en']){const p=await mk(1440,900,1,lang);let tot=0;
 for(const c of CH){const r=await p.goto(`${B}/learn/${c}`);await p.waitForTimeout(800);const i=await cardInfo(p);tot+=i.n;
  log(`c1.${lang}.${c}`,{status:r.status(),n:i.n,figs:i.nonCardFigures,tex:i.tex,bad:i.bad});
  if(lang==='sl'){const f=p.locator(CARD).first();if(await f.count()){await f.scrollIntoViewIfNeeded();await f.screenshot({path:`${D}/${c}-1440-sl.png`})}}}
 log(`c1.${lang}.total`,tot);await p.context().close()}
// c2 live switch
{const p=await mk(1440,900,1,'sl');for(const c of ['bezier-curves','splines']){await p.goto(`${B}/learn/${c}`);await p.waitForTimeout(800);
 const a=await cardInfo(p);await p.locator('select').first().selectOption('en');await p.waitForTimeout(600);const e=await cardInfo(p);
 log(`c2.${c}`,{sl:a.first,en:e.first,changed:a.first.alt!==e.first.alt&&a.first.cap!==e.first.cap,url:p.url()});
 if(c==='bezier-curves'){await p.locator(CARD).first().screenshot({path:`${D}/${c}-1440-en-liveswitch.png`})}
 await p.locator('select').first().selectOption('sl');await p.waitForTimeout(300)}await p.context().close()}
// c3 viewports
const VP=[['1440',1440,900,1,''],['1920',1920,1080,1,''],['390',390,844,1,''],['390x200',390,844,1,'html{font-size:200%!important}'],['1280x200',1280,800,1,'html{font-size:200%!important}']];
for(const [n,w,h,d,css] of VP){const p=await mk(w,h,d,'sl');
 for(const c of CH){await p.goto(`${B}/learn/${c}`);if(css)await p.addStyleTag({content:css});await p.waitForTimeout(700);
  const r=await p.evaluate(async(wi)=>{await eval(wi);
   const de=document.documentElement;const cards=[...document.querySelectorAll('aside.chapter-exploration--guided-example')];
   const bad=[];let ratios=[],layout=new Set();
   for(const c of cards){const i=c.querySelector('img');if(!i){bad.push('noimg');continue}const r=i.getBoundingClientRect();const ra=r.width/r.height;ratios.push(+ra.toFixed(2));
    const cs=getComputedStyle(i);const copy=c.querySelector('.chapter-exploration-copy').getBoundingClientRect();
    layout.add(copy.left>=r.right-2?'beside':(copy.top>=r.bottom-2?'stacked':'other'));
    if(Math.abs(ra-21/13)>0.06||(cs.objectFit==='cover'&&Math.abs(i.naturalWidth/i.naturalHeight-ra)>0.06))bad.push(ra.toFixed(2)+' '+cs.objectFit);
    if(c.scrollWidth>c.clientWidth+1)bad.push('cardOverflow')}
   return {sw:de.scrollWidth,cw:de.clientWidth,bsw:document.body.scrollWidth,n:cards.length,bad,layout:[...layout],rmin:Math.min(...ratios),rmax:Math.max(...ratios)}},waitImgs);
  r.ok=r.sw<=r.cw&&r.bsw<=r.cw;log(`c3.${n}.${c}`,r);
  if((['bezier-curves','foundations','splines'].includes(c)&&(n==='390'||n==='390x200'))||(['bezier-curves','ph-curves'].includes(c)&&n==='1920')){const f=p.locator(CARD).first();await f.scrollIntoViewIfNeeded();await f.screenshot({path:`${D}/${c}-${n}-sl.png`})}}
 await p.context().close()}
}// c4/6/8 launch
for(const [i,c] of CH.entries()){const lang=i<3?'sl':(i%2?'en':'sl');const p=await mk(1440,900,1,lang);
 await p.goto(`${B}/learn/${c}`);await p.waitForTimeout(800);
 const links=p.locator(CARD+' a.chapter-open-activity');const cnt=await links.count();
 if(!cnt){log(`c4.${c}`,{lang,err:'no cards'});await p.context().close();continue}
 const link=links.nth(0);const id=await link.getAttribute('id');
 const lb=await p.locator(CARD+' img').first().evaluate(i=>({inBtn:!!i.closest('button,a'),cursor:getComputedStyle(i).cursor})).catch(()=>null);
 await link.scrollIntoViewIfNeeded();await link.click();await p.waitForTimeout(1500);
 const url1=p.url();const board=await p.evaluate(s=>{const e=document.querySelector(s);return !!e&&e.getBoundingClientRect().width>100},BOARD);
 await p.goBack();await p.waitForTimeout(1000);const u1=p.url();const f1=await p.evaluate(()=>document.activeElement?.id);await p.goForward();await p.waitForTimeout(1500);const u2=p.url();const b2=await p.evaluate(s=>{const e=document.querySelector(s);return !!e&&e.getBoundingClientRect().width>100},BOARD);log('c6.'+c,{afterBack:u1,focusAfterBack:f1,afterFwd:u2,fwdBoard:b2});
 const back=p.getByRole('link',{name:RET}).or(p.getByRole('button',{name:RET})).first();
 const hasBack=await back.count();let ret={};
 if(hasBack){await back.click();await p.waitForTimeout(1200);ret={url:p.url(),focus:await p.evaluate(()=>document.activeElement?.id),inView:await p.evaluate(id=>{const e=document.getElementById(id);if(!e)return false;const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight},id)}}
 log(`c4.${c}`,{lang,id,url1,board,hasBack,ret,focusOk:ret.focus===id,lb});
 await p.context().close()}
// c5 keyboard
for(const [c,lang] of [['bezier-curves','sl'],['ph-curves','en']]){const p=await mk(1440,900,1,lang);await p.goto(`${B}/learn/${c}`);await p.waitForTimeout(800);
 const id=await p.locator(CARD+' a.chapter-open-activity').first().getAttribute('id');
 await p.evaluate(()=>{document.activeElement&&document.activeElement.blur();window.scrollTo(0,0)});let hit=false,n=0;
 for(;n<400;n++){await p.keyboard.press('Tab');if(await p.evaluate(id=>document.activeElement?.id===id,id)){hit=true;break}}
 if(hit){await p.keyboard.press('Enter');await p.waitForTimeout(1500);const url=p.url();
  let found=false;for(let k=0;k<200;k++){await p.keyboard.press('Tab');if(await p.evaluate(s=>new RegExp(s,'i').test(document.activeElement?.textContent||''),RET.source)){found=true;break}}
  let focus2;if(found){await p.keyboard.press('Enter');await p.waitForTimeout(1200);focus2=await p.evaluate(()=>document.activeElement?.id)}
  log(`c5.${c}`,{lang,tabs:n,hit,url,returnFound:found,focus2,focusOnLink:focus2===id,final:p.url()})}else log(`c5.${c}`,{hit:false,n});
 await p.context().close()}
fs.writeFileSync(D+'/errors.log',errs.join('\n'));log('errors',errs.length);
fs.writeFileSync(D+'/results.json',JSON.stringify(R,null,1));await b.close()})().catch(e=>{console.log('FATAL',e);process.exit(1)})
