const L=require('./lib');(async()=>{for(const lang of ['sl','en'])for(const learn of [0,1]){
const {b,p}=await L.open(lang,{width:390,height:844},L.U+(learn?'?learn=1':''));const sl=lang==='sl';
const m=()=>p.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.body.scrollWidth]);
const o={lang,learn,m0:await m()};
const bt=p.locator(learn?'button:has-text("'+(sl?'Naslednji okvir':'Next frame')+'")':'[data-action=next-step]').first();await bt.scrollIntoViewIfNeeded();
const vis=await bt.isVisible();const box=await bt.boundingBox();
const s0=await L.step(p);await bt.click();await p.waitForTimeout(400);o.vis=vis;o.w=box&&Math.round(box.width);o.s0=s0;o.s1=await L.step(p);o.m1=await m();
if(!learn){for(let i=0;i<8;i++){const x=p.locator('[data-action=next-step]');if(await x.getAttribute('aria-disabled')==='true')break;await x.click();await p.waitForTimeout(150)}o.m2=await m()}
o.errs=p.errs;console.log(JSON.stringify(o));if(lang==='sl')await p.screenshot({path:`m-${learn}.png`});await b.close()}})();
