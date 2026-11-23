const {chromium}=require('playwright');const fs=require('fs');
setTimeout(()=>process.exit(2),220000).unref();
const L=s=>{fs.appendFileSync(__dirname+'/02-publish.log',s+'\n');console.log(s)};
(async()=>{const br=await chromium.launch();try{
const p=await (await br.newContext({viewport:{width:1440,height:900}})).newPage();
p.on('console',m=>m.type()==='error'&&L('CONSOLE-ERR '+m.text()));p.on('pageerror',e=>L('PAGEERR '+e.message));
const B='http://127.0.0.1:4471/bezeg-2.0/';
await p.goto(B+'analysis/taylor');await p.waitForTimeout(3500);
const deg=async()=>{await p.waitForTimeout(400);return p.locator('input[type=text]').first().inputValue()};
L('TAY degree start '+await deg());
await p.getByRole('button',{name:'Povečaj število'}).click();L('TAY +1 -> '+await deg());
await p.getByRole('button',{name:'Povečaj število'}).click();L('TAY +1 -> '+await deg());
await p.getByRole('button',{name:'Zmanjšaj število'}).click();L('TAY -1 -> '+await deg());
await p.keyboard.press('Escape');
await p.getByRole('button',{name:'Spoznaj to demonstracijo'}).click();await p.waitForTimeout(1500);
const frame=()=>p.evaluate(()=>{const m=document.body.innerText.match(/Korak \d+ od \d+ · Okvir \d+ od \d+/);return m&&m[0]});
const seen=[];let last='';
for(let i=0;i<60;i++){const f=await frame();if(f!==last){seen.push(f);last=f}
 const next=p.getByRole('button',{name:/^Naprej|Naprej:/}).first();
 if(i===-1){await p.keyboard.press('Escape');await p.waitForTimeout(300);L('TAY lesson Esc at '+f+' (frame after: '+await frame()+')')}
 if(!(await next.isVisible().catch(()=>false))||!(await next.isEnabled().catch(()=>false)))break;
 try{await next.click({timeout:4000})}catch(e){L('TAY click blocked at '+f+': '+e.message.split('@')[0].slice(0,80));break}await p.waitForTimeout(500);}
L('TAY lesson frames seen '+seen.length+': first '+seen[0]+' last '+seen[seen.length-1]);
L('TAY lesson end text: '+(await p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.slice(0,25)).join('|'))));
const pb=await p.getByRole('button',{name:/Predvajaj|Premor/}).count();L('TAY lesson play buttons '+pb);
}finally{await br.close()}})();
