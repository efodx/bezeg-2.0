const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

async function main() {
  const root = path.join(__dirname, 'browser-parity');
  const before = process.argv[2] || 'baseline-idle';
  const after = process.argv[3] || 'after-idle';
  const files = fs.readdirSync(path.join(root, before)).filter(name => name.endsWith('.png'));
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    const results = [];
    for (const file of files) {
      const pair = [before, after].map(phase => 'data:image/png;base64,' + fs.readFileSync(path.join(root, phase, file)).toString('base64'));
      const result = await page.evaluate(async urls => {
        const pixels = await Promise.all(urls.map(async url => {
          const img = new Image();
          img.src = url;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const context = canvas.getContext('2d');
          context.drawImage(img, 0, 0);
          return {width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data};
        }));
        const [a, b] = pixels;
        if (a.width !== b.width || a.height !== b.height) throw new Error('Image dimensions differ');
        let differingPixels = 0;
        for (let i = 0; i < a.data.length; i += 4) {
          if ([0, 1, 2, 3].some(offset => a.data[i + offset] !== b.data[i + offset])) differingPixels++;
        }
        return {width: a.width, height: a.height, differingPixels};
      }, pair);
      results.push({file, ...result});
    }
    fs.writeFileSync(path.join(root, 'idle-comparison.json'), JSON.stringify({before, after, results}, null, 2) + '\n');
    console.log(JSON.stringify(results));
    if (results.some(result => result.differingPixels !== 0)) process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
