import {chromium} from 'file:///C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright/index.mjs';
import fs from 'fs';
export const BASE='http://127.0.0.1:4313/bezeg-2.0';
export const OUT='C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/docs/reviews/feature-streams/geometry/f6-t3-smoke/';
export async function run(name, fn, opts={}){
  const killer=setTimeout(()=>process.exit(2),200000); killer.unref?.();
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:opts.viewport||{width:1280,height:720},acceptDownloads:true});
  const page=await ctx.newPage(); const errs=[];
  page.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text().slice(0,200))});
  page.on('pageerror',e=>errs.push('page:'+String(e).slice(0,200)));
  const res={};
  try{ await fn(page,res,ctx);}catch(e){res.FATAL=String(e).slice(0,400)}finally{
    res.errs=errs; fs.mkdirSync(OUT,{recursive:true}); fs.writeFileSync(OUT+name+'.json',JSON.stringify(res,null,1)); await b.close(); console.log(name, JSON.stringify(res).slice(0,1500)); }
}
export const LC=/(Korak|Step) (\d+) (?:od|of) (\d+) · (?:Okvir|Frame) (\d+) (?:od|of) (\d+)/;
export const NEXT=/^(Naslednji okvir|Next frame)$/;
export const lab=async p=>{const t=await p.innerText('body');const m=t.match(LC);return m?m[0]:null};
export async function enter(p,lang){ if(lang==='en'){await p.selectOption('#bezeg-language','en');await p.waitForTimeout(400);} await p.getByRole('button',{name: lang==='sl'?'Spoznaj to demonstracijo':'Learn this demonstration'}).click(); await p.waitForTimeout(1000); }
export async function walk(p,max=40){const out=[];for(let i=0;i<max;i++){out.push(await lab(p));const nx=p.getByRole('button',{name:NEXT});if(!(await nx.count())) break; if(await nx.isDisabled()) break; await nx.click(); await p.waitForTimeout(350);} return out;}
export const uniq=a=>[...new Set(a.filter(Boolean))];
