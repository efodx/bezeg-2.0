const {chromium}=require('playwright');const fs=require('fs');
setTimeout(()=>process.exit(2),280000).unref();
const L=s=>{fs.appendFileSync(__dirname+'/02-publish.log',s+'\n');console.log(s)};
(async()=>{const br=await chromium.launch();try{
const ctx=await br.newContext({viewport:{width:1440,height:900}});
const B='http://127.0.0.1:4471/bezeg-2.0/';
for(const r of ['functions/transformations','triangle-centres','projective/cross-ratio','patches/coons']){
 const p=await ctx.newPage();let errs=0;
 p.on('console',m=>{if(m.type()==='error'){errs++;L('CONSOLE-ERR ['+r+'] '+m.text().slice(0,300))}});p.on('pageerror',e=>{errs++;L('PAGEERR ['+r+'] '+e.message)});
 await p.goto(B+r);await p.waitForTimeout(3500);
 const shot=async()=>(await p.locator('canvas, svg.JXGtext, .jxgbox').first().screenshot()).toString('base64').length+':'+require('crypto').createHash('md5').update(await p.locator('canvas, .jxgbox').first().screenshot()).digest('hex').slice(0,8);
 const sig=async()=>{const rc=await p.evaluate(()=>{let e=null;try{e=Object.values(JXG.boards)[0].containerObj}catch(x){}e=e||document.querySelector('canvas');const b=e.getBoundingClientRect();return {x:b.left,y:b.top,width:b.width,height:b.height}});return require('crypto').createHash('md5').update(await p.screenshot({clip:rc})).digest('hex').slice(0,8)};
 L('== '+r+' load; panel: '+(await p.evaluate(()=>{const b=document.body.innerText;return b.slice(b.indexOf('Prikaz'),b.indexOf('Prikaz')+0)||''}))+(await p.evaluate(()=>document.body.innerText.replace(/\n/g,' ; ').slice(0,700))));
 let s0=await sig();
 const sels=await p.locator('select.form-select').count();
 for(let i=0;i<sels;i++){const s=p.locator('select.form-select').nth(i);const id=await s.getAttribute('id');if(id==='bezeg-language'||!(await s.isVisible()))continue;
  const opts=await s.evaluate(e=>[...e.options].map(o=>o.value));
  for(const o of opts.slice(0,6)){const a=await sig();await s.selectOption(o);await p.waitForTimeout(900);L('  select '+id+' -> '+o+' changed='+(a!==await sig()))}
  await s.selectOption(opts[0]).catch(()=>{});await p.waitForTimeout(500);}
 const cbs=await p.locator('input[type=checkbox]').count();
 for(let i=0;i<cbs;i++){const c=p.locator('input[type=checkbox]').nth(i);if(!(await c.isVisible()))continue;const a=await sig();const was=await c.isChecked();await c.click({force:true});await p.waitForTimeout(700);const lab=await c.evaluate(e=>(e.closest('label')||e.parentElement).innerText.slice(0,40));L('  checkbox '+i+' ('+lab+') '+was+'->'+await c.isChecked()+' changed='+(a!==await sig()));await c.click({force:true});await p.waitForTimeout(300)}
 const hide=p.getByRole('button',{name:/osnovni graf/});
 if(await hide.count()){const a=await sig();const t0=await hide.innerText();await hide.click();await p.waitForTimeout(600);L('  button "'+t0+'" -> "'+await hide.innerText()+'" changed='+(a!==await sig()));await hide.click()}
 if(r==='patches/coons'){const box=await p.evaluate(()=>{const e=Object.values(JXG.boards)[0].containerObj.getBoundingClientRect();return {x:e.left,y:e.top,width:e.width,height:e.height}});L('  coons container '+JSON.stringify(box)+' canvases='+await p.locator('canvas').count());const a=await sig();
  await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+150,box.y+box.height/2+60,{steps:10});await p.mouse.up();await p.waitForTimeout(600);
  L('  coons camera drag changed='+(a!==await sig()));
  await p.screenshot({path:__dirname+'/02-coons.png'});}
 L('  errors on route: '+errs);
 await p.close();
}
}finally{await br.close()}})();
