import {run,BASE,lab} from './lib.mjs';
const st=async p=>({jxg:await p.evaluate(()=>!!window.JXG&&Object.values(window.JXG.boards).length),svg:await p.$$eval('svg',s=>s.length),spoznaj:await p.getByRole('button',{name:'Spoznaj to demonstracijo'}).count(),learnBtn:await p.getByRole('button',{name:/Spoznaj|Learn this/}).count(),lesson:await lab(p)});
for(const rt of ['voronoi','voronoi-degenerate']) for(const mode of ['plain','learn']) await run('s1-'+rt+'-'+mode,async(page,r)=>{
 await page.goto(BASE+'/compgeo/'+rt+(mode==='learn'?'?learn=1':'')); await page.waitForTimeout(1800);
 r.first=await st(page); await page.reload(); await page.waitForTimeout(1800); r.afterReload=await st(page);
});
