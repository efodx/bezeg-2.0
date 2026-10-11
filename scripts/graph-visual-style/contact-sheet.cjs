const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {readOptions,resolveFromRoot}=require('./cli.cjs');
const options=readOptions(process.argv.slice(2));
const root=path.resolve(options.root||path.join(__dirname,'../..'));
process.env.NODE_PATH=path.join(root,'node_modules');Module._initPaths();
const {chromium}=require('playwright');
const output=resolveFromRoot(root,options.output||'docs/images/graph-visual-style/implementation/contact-sheet.png');
const pairs=[
  ['Ordinary Bezier','bezier-baseline.png','bezier-final.png'],
  ['De Casteljau','decasteljau-baseline.png','decasteljau-final.png'],
  ['Rational Bezier','rational-baseline.png','rational-final.png'],
  ['PH curve with offset enabled','ph-offset-baseline.png','ph-offset-final.png'],
  ['C1 spline joins','spline-c1-baseline.png','spline-c1-final.png'],
  ['Trigonometric function','trigonometric-baseline.png','trigonometric-final.png']
];
function imageData(file){return `data:image/png;base64,${fs.readFileSync(path.join(root,'docs/images/graph-visual-style/implementation',file)).toString('base64')}`}
const cards=pairs.map(([title,before,after])=>`<article><h2>${title}</h2><div class="pair"><figure><figcaption>Before</figcaption><img src="${imageData(before)}"></figure><figure><figcaption>After</figcaption><img src="${imageData(after)}"></figure></div></article>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#f4f1e6;color:#27251f;font-family:Arial,sans-serif}main{width:2200px;padding:34px}h1{font-size:32px;margin:0 0 8px}header p{font-size:18px;color:#555;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}article{background:#fffdf6;border:1px solid #ded9c9;border-radius:10px;padding:16px;box-shadow:0 2px 8px #332c1b12}h2{font-size:21px;margin:0 0 12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0;min-width:0}figcaption{font-size:14px;font-weight:700;color:#575348;margin:0 0 5px}.imgbox{height:460px;border:1px solid #e7e1d3;background:#faf9f4;display:flex;align-items:center;justify-content:center;overflow:hidden}img{max-width:100%;max-height:100%;object-fit:contain;display:block}footer{font-size:13px;color:#605c52;margin-top:12px}
</style></head><body><main><header><h1>Graph styling: matched before and after scenes</h1><p>Production-build screenshots at default inputs and bounds. Each pair uses the same scene and viewport; PH offsets are enabled in both images.</p></header><section class="grid">${cards}</section><footer>Baseline screenshots are in the left column; final screenshots are on the right. Full-resolution images are linked in the review document.</footer></main></body></html>`;
async function main(){fs.mkdirSync(path.dirname(output),{recursive:true});const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:2200,height:800},deviceScaleFactor:1});await page.setContent(html,{waitUntil:'load'});await page.screenshot({path:output,fullPage:true,animations:'disabled'});console.log(`wrote ${output}`)}finally{await browser.close()}}
main().catch(error=>{console.error(error);process.exitCode=1});
