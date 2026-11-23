// CPU profile of one Taylor puck drag (or Orodja slider drag with --slider): self time per function, top N.
// node profile-05.cjs --url http://127.0.0.1:4483 --throttle 4 [--route analysis/taylor] [--slider]
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const base = (args.url || 'http://127.0.0.1:4483').replace(/\/$/, '');
const throttle = Number(args.throttle || 4);
const route = args.route || 'analysis/taylor';
const useSlider = 'slider' in args;
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* */ } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});
    await page.goto(`${base}/bezeg-2.0/${route}`);
    const sel = useSlider ? 'input[type=range]' : '.puck-strip [role=slider]';
    await page.locator(sel).first().waitFor();
    await page.waitForTimeout(2500);
    const box = await page.locator(sel).first().boundingBox();
    const x0 = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', {interval: 200});
    await cdp.send('Profiler.start');
    const steps = 60, travel = 300, begin = Date.now();
    for (let i = 1; i <= steps; i++) {
        const f = i <= steps / 2 ? i / (steps / 2) : 2 - i / (steps / 2);
        await page.mouse.move(x0 + travel * f, y);
        const wait = begin + i * (2000 / steps) - Date.now();
        if (wait > 0) await page.waitForTimeout(wait);
    }
    await page.waitForTimeout(150);
    const {profile} = await cdp.send('Profiler.stop');
    await page.mouse.up();
    const byId = new Map(profile.nodes.map(n => [n.id, n]));
    const self = new Map();
    profile.samples.forEach((id, i) => {
        const n = byId.get(id), dt = (profile.timeDeltas[i] || 0) / 1000;
        const cf = n.callFrame;
        const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber}`;
        self.set(k, (self.get(k) || 0) + dt);
    });
    const total = [...self.values()].reduce((a, b) => a + b, 0);
    const idle = (self.get('(idle) :0') || 0);
    console.log(`slider=${useSlider} throttle=${throttle} total ms ${total.toFixed(0)} idle ${idle.toFixed(0)} busy ${(total - idle).toFixed(0)} per move ${((total - idle) / steps).toFixed(1)}`);
    [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
    // Callers of the forced-layout reads: walk up to the nearest non-library frames.
    const parent = new Map();
    profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
    const callers = new Map();
    profile.samples.forEach((id, i) => {
        const n = byId.get(id);
        if (!/getBoundingClientRect|offsetWidth|offsetHeight|\(program\)|getComputedStyle/.test(n.callFrame.functionName)) return;
        const chain = [];
        for (let p = parent.get(id); p !== undefined && chain.length < 4; p = parent.get(p)) {
            const cf = byId.get(p).callFrame;
            chain.push(`${cf.functionName || '(anon)'}@${cf.url.split('/').pop()}:${cf.lineNumber}:${cf.columnNumber}`);
        }
        const k = `${n.callFrame.functionName} <- ${chain.join(' <- ')}`;
        callers.set(k, (callers.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000);
    });
    // Category per sample by its stack (dev server shows source names): board (jsxgraph.js), react commit/render, other.
    const cat = new Map();
    profile.samples.forEach((id, i) => {
        const names = [];
        for (let p = id; p !== undefined; p = parent.get(p)) { const cf = byId.get(p).callFrame; names.push(`${cf.functionName}|${cf.url}`); }
        const s = names.join('\n');
        let k = /idle\)/.test(names[0]) ? 'idle' : /jsxgraph\.js/.test(s) ? 'jsxgraph' : /commitRoot|performSyncWorkOnRoot|performConcurrentWorkOnRoot|flushSync|renderRootSync/.test(s) ? 'react render/commit' : /Graph\.ts|Graph\.tsx|graphs\//.test(s) ? 'graph code' : /^\(program\)/.test(names[0]) ? 'program(native)' : 'other';
        cat.set(k, (cat.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000);
    });
    const incl = new Map();
    const watch = (args.watch || 'onPointerMove,onStateChange,performSyncWorkOnRoot,performConcurrentWorkOnRoot,commitRoot,renderRootSync,flushPassiveEffects,commitLayoutEffects,updateElements,setCoordinates,write,onWrite,setRuler,layoutBoard,measure').split(',');
    profile.samples.forEach((id, i) => {
        const seen = new Set();
        for (let p = id; p !== undefined; p = parent.get(p)) { const fn = byId.get(p).callFrame.functionName; if (watch.includes(fn) && !seen.has(fn)) { seen.add(fn); incl.set(fn, (incl.get(fn) || 0) + (profile.timeDeltas[i] || 0) / 1000); } }
    });
    console.log('--- inclusive by function (ms)', JSON.stringify([...incl.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v)])));
    console.log('--- inclusive by category (ms)', JSON.stringify([...cat.entries()].map(([k, v]) => [k, Math.round(v)])));
    const byFile = new Map();
    profile.samples.forEach((id, i) => {
        const cf = byId.get(id).callFrame;
        const k = cf.url ? cf.url.split('/').pop().replace(/\?.*/, '') : cf.functionName;
        byFile.set(k, (byFile.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000);
    });
    console.log('--- self by file', JSON.stringify([...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, Math.round(v)])));
    console.log('--- callers');
    [...callers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
    await browser.close();
})();
