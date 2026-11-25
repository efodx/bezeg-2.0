// node cmp.cjs : pixel comparison of before-N.png and after-N.png (board screenshots), via a browser canvas
const {chromium} = require('playwright'); const fs = require('fs');
(async () => {
    const browser = await chromium.launch(); const page = await browser.newPage();
    for (const n of [2, 6, 10]) {
        const a = fs.readFileSync(`before-${n}.png`).toString('base64'), b = fs.readFileSync(`after-${n}.png`).toString('base64');
        const r = await page.evaluate(async ([a, b]) => {
            const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
            const [x, y] = await Promise.all([load(a), load(b)]);
            const get = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
            const p = get(x), q = get(y); let d = 0, mx = 0;
            for (let i = 0; i < p.length; i += 4) { const m = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])); if (m) d++; if (m > mx) mx = m; }
            return {w: x.width, h: x.height, differing: d, max: mx};
        }, [a, b]);
        console.log(n, JSON.stringify(r));
    }
    await browser.close();
})();
