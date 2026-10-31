const L=require('./lib.js');const D=__dirname;const mobile=process.argv[2]==='m';
(async()=>{const {br,page,errs}=await L.open(mobile?{ctx:{viewport:{width:390,height:844},hasTouch:true,isMobile:true}}:{});
const R=(n,v)=>console.log(n,JSON.stringify(v));
await page.goto(L.B+'/learn/bezier-curves');await page.waitForTimeout(2500);
const pg=page.locator('.playground--inspect');const cv=pg.locator('svg.playground__canvas');await cv.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
const na=()=>pg.locator('[data-role="anchor"]').count();const d=()=>pg.locator('path.playground__shape').getAttribute('d');
R('initial anchors (fresh storage)',await na());await pg.locator('.playground__toolbar button',{hasText:/^Load example$/}).click();await page.waitForTimeout(400);R('anchors after Load example',await na());R('segment',await pg.locator('[data-lu=segment]').innerText());
R('overlay labels',await pg.locator('svg text').allInnerTexts());
await page.screenshot({path:D+`/b-${mobile?'m':'d'}-overlays.png`});
// press segment 2 (hit path)
const hits=pg.locator('[data-role=segment]');R('seg hits',await hits.count());
const n0=await na(),d0=await d();
const segIdx=1;const info=await hits.nth(segIdx).evaluate(p=>{const L=p.getTotalLength();const pt=p.getPointAtLength(L*0.37);const m=p.getScreenCTM();return [pt.x*m.a+m.e,pt.y*m.d+m.f]});
if(mobile)await page.touchscreen.tap(info[0],info[1]);else await page.mouse.click(info[0],info[1]);await page.waitForTimeout(300);
R('after press seg1',{seg:await pg.locator('[data-lu=segment]').innerText(),anchors:[n0,await na()],dSame:d0===await d(),labels:await pg.locator('svg text.lu-point-label').allInnerTexts()});
// drag on segment
if(!mobile){await page.mouse.move(info[0],info[1]);await page.mouse.down();await page.mouse.move(info[0]+30,info[1]+30,{steps:6});await page.mouse.up();await page.waitForTimeout(300);R('drag on segment',{anchors:await na(),dSame:d0===await d()})}
// t slider
const inputs=pg.locator('.lu-controls input:not([type=checkbox])');R('slider inputs',await inputs.evaluateAll(e=>e.map(x=>x.type+':'+x.value)));
const bt=()=>pg.locator('[data-overlay-part=bt]').evaluate(c=>c.getAttribute('cx')+','+c.getAttribute('cy'));
const rng=pg.locator('.lu-controls input[type=range]').first();
const res=[];for(const v of [0,0.5,1]){await rng.evaluate((e,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,String(v));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},v);await page.waitForTimeout(250);res.push([v,await bt()])}
R('B(t)',res);
const segpts=await pg.locator('svg text').count();
await page.screenshot({path:D+`/b-${mobile?'m':'d'}-t1.png`});
R('errs',errs);await br.close()})().catch(e=>{console.log('FAIL',e.message.slice(0,500));process.exit(1)})
