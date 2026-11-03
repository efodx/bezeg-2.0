import {run,BASE,OUT} from './lib.mjs';
import fs from 'fs';
async function exp(page,r,key,fmt){
 await page.getByRole('button',{name:/^(Shrani|Save)$/}).first().click(); await page.waitForTimeout(300);
 const [dl]=await Promise.all([page.waitForEvent('download',{timeout:15000}),page.getByRole('button',{name:fmt,exact:true}).click()]);
 const f=OUT+key+'.'+fmt.toLowerCase(); await dl.saveAs(f); const buf=fs.readFileSync(f);
 const o={name:dl.suggestedFilename(),bytes:buf.length};
 if(fmt==='SVG'){const s=buf.toString('utf8');o.polygon=(s.match(/<polygon\b/g)||[]).length;o.path=(s.match(/<path\b/g)||[]).length;o.circle=(s.match(/<circle\b/g)||[]).length;o.line=(s.match(/<line\b/g)||[]).length;o.text=[...s.matchAll(/<text[^>]*>([^<]*)</g)].map(m=>m[1]).filter(Boolean).slice(0,30);}
 else {o.sig=buf.slice(0,8).toString('hex');o.dim=[buf.readUInt32BE(16),buf.readUInt32BE(20)];}
 r[key+'.'+fmt]=o;
 await page.keyboard.press('Escape'); await page.waitForTimeout(200);
}
for(const rt of ['voronoi','voronoi-degenerate']) for(const lang of ['sl','en']) await run('e-'+rt+'-'+lang,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt); await page.waitForTimeout(1500);
 if(lang==='en'){await page.selectOption('#bezeg-language','en');await page.waitForTimeout(500);}
 const k=(rt==='voronoi'?'v':'d')+'-'+lang;
 await exp(page,r,k+'-start','SVG'); await exp(page,r,k+'-start','PNG');
});
