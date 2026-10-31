const {chromium}=require('playwright');
exports.B='http://127.0.0.1:4312/bezeg-2.0';
exports.open=async(opts={})=>{const br=await chromium.launch();const ctx=await br.newContext(opts.ctx||{viewport:{width:1440,height:900}});
await ctx.addInitScript(l=>{if(!localStorage.getItem('bezeg-2.0:bezeg-language'))localStorage.setItem('bezeg-2.0:bezeg-language',l)},opts.lang||'en');
const page=await ctx.newPage();const errs=[];page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});page.on('pageerror',e=>errs.push('PE '+e.message));return{br,ctx,page,errs}};
