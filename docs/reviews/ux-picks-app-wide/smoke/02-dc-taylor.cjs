const {chromium}=require('playwright');const fs=require('fs');
setTimeout(()=>process.exit(2),220000).unref();
const L=s=>{fs.appendFileSync(__dirname+'/02-publish.log',s+'\n');console.log(s)};
(async()=>{const br=await chromium.launch();try{
const p=await (await br.newContext({viewport:{width:1440,height:900}})).newPage();
p.on('console',m=>m.type()==='error'&&L('CONSOLE-ERR '+m.text()));p.on('pageerror',e=>L('PAGEERR '+e.message));
const B='http://127.0.0.1:4471/bezeg-2.0/';
// --- De Casteljau
await p.goto(B+'bezier/decasteljau');await p.waitForTimeout(3500);
const t=()=>p.locator('input[type=text]').first().inputValue();
const rng=()=>p.locator('input[type=range]').first().inputValue();
L('DC initial t='+await t());
await p.getByRole('button',{name:'Ponastavi'}).click();await p.waitForTimeout(300);
L('DC after reset t='+await t()+' range='+await rng());
await p.getByRole('button',{name:'Predvajaj'}).click();await p.waitForTimeout(1200);
const a=await t();await p.waitForTimeout(600);const b=await t();
L('DC playing t '+a+' -> '+b+' ; button now: '+await p.locator('button').filter({hasText:/Premor|Ustavi|Pavza|Predvajaj/}).first().innerText());
// pause
await p.getByRole('button',{name:/Premor|Ustavi|Pavza/}).first().click();await p.waitForTimeout(300);
const c=await t();await p.waitForTimeout(700);L('DC pause: '+c+' -> '+await t());
// play then type
await p.getByRole('button',{name:'Predvajaj'}).click();await p.waitForTimeout(200);
const f=p.locator('input[type=text]').first();await f.click();await f.fill('0,25');await f.press('Enter');
await p.waitForTimeout(300);const d1=await t();await p.waitForTimeout(1500);
L('DC play then type 0,25: t '+d1+' -> '+await t()+' ; range '+await rng()+' ; play btn visible: '+await p.getByRole('button',{name:'Predvajaj'}).isVisible());
// Esc
await p.locator('body').click({position:{x:5,y:5}}).catch(()=>{});
await p.getByRole('button',{name:'Predvajaj'}).click();await p.waitForTimeout(700);await p.keyboard.press('Escape');await p.waitForTimeout(300);
const e1=await t();await p.waitForTimeout(800);L('DC Esc: '+e1+' -> '+await t()+' ; play btn visible: '+await p.getByRole('button',{name:'Predvajaj'}).isVisible());
// --- Taylor
await p.goto(B+'analysis/taylor');await p.waitForTimeout(3500);
const deg=()=>p.locator('input[type=text]').first().inputValue();
const err=p.getByRole('button',{name:/oceno napake/});
const st=async()=>(await err.getAttribute('aria-pressed'))+'|'+(await err.innerText());
L('TAY err initial '+await st());await err.click();await p.waitForTimeout(500);L('TAY err after click '+await st());await err.click();await p.waitForTimeout(400);L('TAY err after 2nd click '+await st());
await p.getByRole('button',{name:'Povečaj število'}).click();await p.getByRole('button',{name:'Povečaj število'}).click();L('TAY degree +2 -> '+await deg());
await p.getByRole('button',{name:'Zmanjšaj število'}).click();L('TAY degree -1 -> '+await deg());
const pl=await p.getByRole('button',{name:/Predvajaj/}).count();L('TAY play buttons '+pl);
if(pl){const r=()=>p.locator('input[type=range]').nth(1).inputValue();await p.getByRole('button',{name:/Predvajaj/}).first().click();await p.waitForTimeout(800);const q=await r();await p.keyboard.press('Escape');await p.waitForTimeout(300);const q2=await r();await p.waitForTimeout(700);L('TAY Esc: '+q2+' -> '+await r()+' (during '+q+')');}
await p.screenshot({path:__dirname+'/02-taylor.png'});
// lesson
await p.getByRole('button',{name:'Spoznaj to demonstracijo'}).click();await p.waitForTimeout(1500);
L('TAY learn click url '+p.url());
L('TAY page: '+(await p.evaluate(()=>document.body.innerText.slice(0,500))).replace(/\n/g,' ; '));
}finally{await br.close()}})();
