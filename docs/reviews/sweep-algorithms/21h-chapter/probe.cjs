const {chromium}=require('C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/stream-geometry/node_modules/playwright');
(async()=>{const br=await chromium.launch();const p=await br.newPage();
await p.goto('http://localhost:4313/bezeg-2.0/learn/sweep-algorithms');await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/^(SL|EN)$/.test(e.textContent.trim())).map(e=>e.parentElement.outerHTML.slice(0,250))));
await br.close()})();
