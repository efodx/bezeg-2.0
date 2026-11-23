const {chromium}=require('playwright');const fs=require('fs');
setTimeout(()=>process.exit(2),250000).unref();
const L=s=>{fs.appendFileSync(__dirname+'/02-publish.log',s+'\n');console.log(s)};
(async()=>{const br=await chromium.launch();try{
const routes=['linear-map','analysis/phase-portrait','bezier/decasteljau','analysis/taylor','functions/transformations','triangle-centres','projective/cross-ratio','patches/coons'];
for(const [w,h] of [[390,844],[1024,768]]){
 const ctx=await br.newContext({viewport:{width:w,height:h}});
 for(const r of routes){const p=await ctx.newPage();let errs=[];
  p.on('console',m=>m.type()==='error'&&errs.push(m.text().slice(0,200)));p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await p.goto('http://127.0.0.1:4471/bezeg-2.0/'+r);await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>({boards:typeof JXG!=='undefined'?Object.keys(JXG.boards).length:-1,sw:document.documentElement.scrollWidth,h1:(document.querySelector('h1,h2')||{}).innerText}));
  L(`WIDTH ${w} ${r}: errors=${errs.length} ${errs.join('|')} boards=${info.boards} scrollWidth=${info.sw} title=${info.h1}`);await p.close();}
 await ctx.close();}
}finally{await br.close()}})();
