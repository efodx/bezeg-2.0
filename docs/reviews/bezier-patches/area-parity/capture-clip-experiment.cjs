const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const out = __dirname;
const viewport = {width: 1440, height: 960};

async function capture(browser, phase, port, disableLabelClip) {
  const context = await browser.newContext({viewport, deviceScaleFactor: 1, locale: 'sl-SI', colorScheme: 'light', reducedMotion: 'reduce', timezoneId: 'Europe/Ljubljana'});
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/bezeg-2.0/functions/area-between`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.locator('#jgbox').waitFor({state: 'visible', timeout: 30000});
  await page.waitForFunction(() => {
    const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.container === 'jgbox');
    return Boolean(board?.objectsList?.length);
  }, {timeout: 30000});
  await page.evaluate(async () => {
    await window.MathJax?.startup?.promise;
    await window.MathJax?.typesetPromise?.();
    await document.fonts.ready;
  });
  await page.waitForTimeout(120);
  const details = await page.evaluate(disable => {
    const board = Object.values(window.JXG.boards).find(candidate => candidate.container === 'jgbox');
    const labels = Object.values(board.objects).filter(object => object.elType === 'point' && /^\$\$P_[12]\$\$$/.test(object.name));
    if (labels.length !== 2) throw new Error(`Expected two intersection labels, found ${labels.length}`);
    if (disable) for (const point of labels) point.label.setAttribute({clip: false});
    return {version: window.JXG.version, labels: labels.map(point => ({name: point.name, clip: point.label.visProp.clip, rect: point.label.rendNode.getBoundingClientRect().toJSON(), clipPath: point.label.rendNode.style.clipPath}))};
  }, disableLabelClip);
  const filename = path.join(out, `${phase}.png`);
  await page.screenshot({path: filename, fullPage: true, animations: 'disabled', caret: 'hide'});
  await context.close();
  return {phase, port, disableLabelClip, ...details, filename};
}

async function compare(browser, first, second) {
  const page = await browser.newPage();
  const result = await page.evaluate(async ([aData, bData]) => {
    const load = async data => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      return {width: canvas.width, height: canvas.height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data};
    };
    const [a, b] = await Promise.all([load(aData), load(bData)]);
    if (a.width !== b.width || a.height !== b.height) throw new Error('Screenshot dimensions differ');
    let different = 0; let x0 = a.width, y0 = a.height, x1 = -1, y1 = -1;
    for (let i = 0; i < a.pixels.length; i += 4) {
      if ([0,1,2,3].some(c => a.pixels[i+c] !== b.pixels[i+c])) {
        different++;
        const p = i / 4, x = p % a.width, y = Math.floor(p / a.width);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    return {width:a.width,height:a.height,differentPixels:different,bbox:different?[x0,y0,x1,y1]:null};
  }, [first, second].map(file => fs.readFileSync(file).toString('base64')));
  await page.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const captures = [];
    captures.push(await capture(browser, 'fresh-baseline', 4398, false));
    captures.push(await capture(browser, 'fresh-upgrade-clip-false', 4396, true));
    captures.push(await capture(browser, 'fresh-upgrade-default', 4396, false));
    captures.push(await capture(browser, 'fresh-baseline-repeat', 4398, false));
    captures.push(await capture(browser, 'fresh-upgrade-default-repeat', 4396, false));
    captures.push(await capture(browser, 'fresh-baseline-repeat-2', 4398, false));
    captures.push(await capture(browser, 'fresh-upgrade-default-repeat-2', 4396, false));
    const suppliedBaseline = path.join(root, 'browser-parity', 'baseline-idle', 'area-between-curves.png');
    const suppliedUpgrade = path.join(root, 'browser-parity', 'after-idle', 'area-between-curves.png');
    const comparisons = {
      suppliedBaselineToFreshBaseline: await compare(browser, suppliedBaseline, path.join(out, 'fresh-baseline.png')),
      suppliedBaselineToClipFalse: await compare(browser, suppliedBaseline, path.join(out, 'fresh-upgrade-clip-false.png')),
      freshBaselineToClipFalse: await compare(browser, path.join(out, 'fresh-baseline.png'), path.join(out, 'fresh-upgrade-clip-false.png')),
      freshBaselineToUpgradeDefault: await compare(browser, path.join(out, 'fresh-baseline.png'), path.join(out, 'fresh-upgrade-default.png')),
      repeatBaselineToUpgradeDefault: await compare(browser, path.join(out, 'fresh-baseline-repeat.png'), path.join(out, 'fresh-upgrade-default-repeat.png')),
      repeat2BaselineToUpgradeDefault: await compare(browser, path.join(out, 'fresh-baseline-repeat-2.png'), path.join(out, 'fresh-upgrade-default-repeat-2.png')),
      freshBaselineToBaselineRepeat: await compare(browser, path.join(out, 'fresh-baseline.png'), path.join(out, 'fresh-baseline-repeat.png')),
      freshUpgradeToUpgradeRepeat: await compare(browser, path.join(out, 'fresh-upgrade-default.png'), path.join(out, 'fresh-upgrade-default-repeat.png')),
      suppliedBaselineToUpgradeDefault: await compare(browser, suppliedBaseline, path.join(out, 'fresh-upgrade-default.png')),
      suppliedUpgradeToFreshUpgradeDefault: await compare(browser, suppliedUpgrade, path.join(out, 'fresh-upgrade-default.png')),
    };
    const result = {browser: {version: browser.version(), viewport, deviceScaleFactor: 1, locale:'sl-SI',colorScheme:'light',reducedMotion:'reduce',timezoneId:'Europe/Ljubljana'}, captures, comparisons};
    fs.writeFileSync(path.join(out, 'clip-experiment.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({browser:result.browser,captures:captures.map(({phase,version,labels})=>({phase,version,labels})),comparisons},null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
