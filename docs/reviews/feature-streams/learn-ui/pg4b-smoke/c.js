const L=require('./lib.js');const D=__dirname;
(async()=>{const {br,ctx,page,errs}=await L.open({lang:'sl'});
const R=(n,v)=>console.log(n,JSON.stringify(v));
await page.goto(L.B+'/learn');await page.waitForTimeout(1500);
R('D landing SL',{h1:await page.locator('h1').first().innerText(),cards:await page.locator('a[href*="/learn/"]').count()});
await page.screenshot({path:D+'/d-landing-sl.png'});
await page.goto(L.B+'/learn/bezier-curves');await page.waitForTimeout(2500);
const dr=page.locator('.playground--draw'),ins=page.locator('.playground--inspect');
R('SL toolbar',await dr.locator('.playground__toolbar button').allInnerTexts());
R('SL switches',await ins.locator('.lu-switch').allInnerTexts());
R('SL mounts',{draw:await dr.count(),inspect:await ins.count(),sec:await page.locator('.playground').evaluateAll(e=>e.map(x=>x.closest('section')?.querySelector('h2,h3')?.textContent))});
// draw in draw block
const bb=await (dr.locator('svg.playground__canvas')).boundingBox();
await dr.locator('svg.playground__canvas').scrollIntoViewIfNeeded();const b2=await dr.locator('svg.playground__canvas').boundingBox();
for(const [x,y] of [[.2,.7],[.5,.2],[.8,.7],[.5,.9]]){await page.mouse.click(b2.x+b2.width*x,b2.y+b2.height*y);await page.waitForTimeout(100)}
await page.waitForTimeout(900);
R('live SL',await dr.locator('.playground__live').innerText());
const n=()=>page.locator('.playground--draw [data-role=anchor]').count();
R('draw anchors / inspect anchors',[await n(),await ins.locator('[data-role=anchor]').count()]);
await page.waitForTimeout(900);
await page.reload();await page.waitForTimeout(2500);
R('after reload draw/inspect anchors',[await dr.locator('[data-role=anchor]').count(),await ins.locator('[data-role=anchor]').count()]);
R('storage',await page.evaluate(()=>(localStorage.getItem('bezeg-2.0:bezier-playground.drawing.v1')||'').length));
// live switch
await dr.locator('svg.playground__canvas').scrollIntoViewIfNeeded();
await page.selectOption('#bezeg-language','en');await page.waitForTimeout(1200);
R('EN toolbar after live switch',await dr.locator('.playground__toolbar button').allInnerTexts());
R('EN live',await dr.locator('.playground__live').innerText());
R('EN anchors',[await dr.locator('[data-role=anchor]').count(),await ins.locator('[data-role=anchor]').count()]);
R('EN anchor label',await dr.locator('[data-role=anchor]').first().getAttribute('aria-label'));
R('EN switches',await ins.locator('.lu-switch').allInnerTexts());
// edit in inspect (EN): delete an anchor
await ins.locator('svg.playground__canvas').scrollIntoViewIfNeeded();
await ins.locator('[data-role=anchor]').last().focus();await page.keyboard.press('Delete');await page.waitForTimeout(1200);
R('inspect delete -> draw/inspect anchors',[await dr.locator('[data-role=anchor]').count(),await ins.locator('[data-role=anchor]').count()]);
await page.reload();await page.waitForTimeout(2500);R('EN after reload',[await dr.locator('[data-role=anchor]').count(),await ins.locator('[data-role=anchor]').count()]);
R('EN spline link',await ins.locator('xpath=ancestor::*[self::section][1]//a[contains(@href,"spline")]').evaluateAll(a=>a.map(x=>x.getAttribute('href'))).catch(e=>e.message));
const link=page.locator('.chapter-paragraph a[href*="spline"]').first();const sl=await link.count();R('spline links in para',sl);
if(sl){await Promise.all([page.waitForURL(/spline/),link.click()]);R('spline link navigated',page.url());await page.waitForTimeout(1500)}
// D EN
await page.goto(L.B+'/learn');await page.waitForTimeout(1500);
R('D landing EN',{h1:await page.locator('h1').first().innerText()});await page.screenshot({path:D+'/d-landing-en.png'});
const cards=page.locator('a[href*="/learn/"]');const first=await cards.first().getAttribute('href');
await cards.first().click();await page.waitForTimeout(2000);R('chapter card link',[first,page.url(),await page.locator('h1').first().innerText()]);
R('errs',errs);await br.close()})().catch(e=>{console.log('FAIL',e.message.slice(0,500));process.exit(1)})
