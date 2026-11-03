import {run,BASE,lab,enter,walk,uniq,NEXT} from './lib.mjs';
const EXIT={sl:/Končaj vodeni primer/,en:/Exit example/};
const MODE=process.argv[2]||'walk';
if(MODE==='walk') for(const rt of ['voronoi','voronoi-degenerate']) for(const lang of ['en']) await run('w-'+rt+'-'+lang,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt); await page.waitForTimeout(1500);
 await enter(page,lang);
 r.labels=uniq(await walk(page,40)); r.frames=r.labels.length;
 r.finalLabel=await lab(page); r.nextLeft=await page.getByRole('button',{name:NEXT}).count();
 r.finalText=((await page.innerText('body')).match(/(Finished|Done|Completed)[^\n]*/)||[null])[0];
 r.exitBtn=await page.getByRole('button',{name:EXIT[lang]}).count();
});
if(MODE==='live') for(const rt of ['voronoi','voronoi-degenerate']) await run('x-'+rt,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt); await page.waitForTimeout(1500);
 await enter(page,'sl');
 for(let i=0;i<30;i++){const l=await lab(page);if(l&&/(Korak|Step) 4 (od|of) 7/.test(l))break;await page.getByRole('button',{name:NEXT}).click();await page.waitForTimeout(350);}
 r.before={label:await lab(page),title:((await page.innerText('body')).match(/Voronojev[^\n]*|Izrojena[^\n]*/)||[null])[0]};
 await page.selectOption('#bezeg-language','en'); await page.waitForTimeout(600);
 const t=await page.innerText('body');
 r.afterSwitch={label:await lab(page),korakLeft:(t.match(/Korak/g)||[]).length,title:((t.match(/Voronoi[^\n]*|Degenerate[^\n]*/)||[null])[0]),nextEn:await page.getByRole('button',{name:NEXT}).count()};
 await page.getByRole('button',{name:NEXT}).click(); await page.waitForTimeout(400); r.afterNext=await lab(page);
 await page.selectOption('#bezeg-language','sl'); await page.waitForTimeout(600); r.backSl=await lab(page);
});
