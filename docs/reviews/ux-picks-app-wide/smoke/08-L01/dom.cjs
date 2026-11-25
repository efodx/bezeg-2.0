// DOM check of the converted blossom. Run: node docs/reviews/ux-picks-app-wide/smoke/08-L01/dom.cjs
const path = require('path');
const {chromium} = require(path.join(process.cwd(), 'node_modules', 'playwright'));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:4483/bezeg-2.0/bspline/blossom');
  await page.waitForSelector('[data-puck-key="blossom-a"]', {timeout: 30000});
  await page.waitForTimeout(1500);
  const result = await page.evaluate(() => {
    const keys = ['blossom-a', 'blossom-b', 'blossom-c', 'blossom-segment', 'show-bezier'];
    const counts = Object.fromEntries(keys.map(k => [k, document.querySelectorAll(`[data-puck-key="${k}"]`).length]));
    const cards = [...document.querySelectorAll('[data-card-id]')].map(c => c.getAttribute('data-card-id'));
    const tools = document.querySelector('[data-card-id="tools"]') || [...document.querySelectorAll('[data-card-id]')].find(c => /Orodja/.test(c.textContent || '') );
    const toolsText = tools ? tools.textContent : null;
    const toolsSliders = tools ? tools.querySelectorAll('[role="slider"], input[type="range"]').length : null;
    const toolsSelect = tools ? tools.querySelectorAll('select').length : null;
    const toolsSwitch = tools ? tools.querySelectorAll('[role="switch"], input[type="checkbox"]').length : null;
    const toolsHasDegree = tools ? /Stopnja/.test(toolsText) : null;
    const odd = tools ? [...tools.querySelectorAll('[role="slider"], input[type="range"], select')].map(e => e.outerHTML.slice(0, 160)) : null; const strip = [...document.querySelectorAll('[data-puck-key]')].map(e => e.getAttribute('data-puck-key'));
    return {odd, counts, cards, toolsFound: !!tools, toolsSliders, toolsSelect, toolsSwitch, toolsHasDegree, toolsMentionsSegment: tools ? /Odsek krivulje/.test(toolsText) : null, toolsMentionsBezier: tools ? /Bézier/.test(toolsText) : null, strip};
  });
  console.log(JSON.stringify({...result, errors}));
  await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/08-L01/blossom.png'});
  await browser.close();
})();
