const L=require('./lib.js');(async()=>{const {br,page}=await L.open({ctx:{viewport:{width:390,height:844},hasTouch:true,isMobile:true}});
await page.goto(L.B+'/learn/bezier-curves');await page.waitForTimeout(2500);
const cv=page.locator('.playground--draw svg.playground__canvas');await cv.scrollIntoViewIfNeeded();
const cdp=await page.context().newCDPSession(page);
const swipe=async(label,x,y0,y1)=>{const a=await page.evaluate(()=>scrollY);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});
for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*i/12}]});await page.waitForTimeout(16)}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);console.log(label,a,await page.evaluate(()=>scrollY))};
const cb=await cv.boundingBox();
await swipe('outside canvas (below)',195,cb.y+cb.height+200,cb.y+cb.height+20);
await swipe('on canvas',195,cb.y+150,cb.y+20);
await br.close()})()
