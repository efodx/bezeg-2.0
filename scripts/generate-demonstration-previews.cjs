// Regenerate versioned decorative SVGs: node scripts/generate-demonstration-previews.cjs.
// Uses the existing models only at generation time; the catalog loads static assets.
// Math labels are typeset by MathJax in headless Chromium (needs network for the CDN) and
// embedded as glyph paths, because an SVG shown through <img> cannot run MathJax itself.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, filename);
};
const {PointImpl} = require('../src/bezeg/impl/point/point-impl.ts');
const {PolynomialBezierCurve} = require('../src/bezeg/impl/curve/polynomial-bezier-curve.ts');
const {RationalBezierCurve} = require('../src/bezeg/impl/curve/rational-bezier-curve.ts');
const {PhBezierCurve} = require('../src/bezeg/impl/curve/ph-bezier-curve.ts');
const {GraphPalette, comparisonCurveColor} = require('../src/graphs/styles/GraphPalette.ts');
const output = path.join(root, 'src/images/demonstrations');
fs.mkdirSync(output, {recursive:true});
const point = ([x,y]) => new PointImpl(x,y);
const xy = p => [p.X(),p.Y()];
const sample = curve => Array.from({length:101}, (_,i) => xy(curve.eval(i/100)));
const number = value => {assert(Number.isFinite(value), 'Preview coordinates must be finite'); return value.toFixed(2);};
const d = points => points.map(([x,y],i) => `${i ? 'L' : 'M'}${number(x)},${number(y)}`).join(' ');
const line = (points,color,width=2.5,extra='') => `<path d="${d(points)}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const dot = ([x,y],radius=3.2,color=GraphPalette.controlPoint) => `<circle cx="${number(x)}" cy="${number(y)}" r="${radius}" fill="${color}" stroke="${GraphPalette.pointOutline}" stroke-width="1.5"/>`;
const svg = (width,height,body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>\n`;
const save = (name,width,height,body) => fs.writeFileSync(path.join(output,`${name}.svg`),svg(width,height,body));
const mathJaxUrl = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
const typeset = async labels => {
    const {chromium} = require('playwright');
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        await page.setContent(`<script>window.MathJax={svg:{fontCache:'none'},startup:{typeset:false}};</script><script src="${mathJaxUrl}"></script>`);
        await page.waitForFunction(() => window.MathJax && window.MathJax.tex2svg);
        const rendered = await page.evaluate(labels => labels.map(tex => {
            const node = window.MathJax.tex2svg(tex, {display:false}).querySelector('svg');
            node.querySelectorAll('*').forEach(child => [...child.attributes].filter(a => a.name.startsWith('data-')).forEach(a => child.removeAttribute(a.name)));
            return {viewBox:node.getAttribute('viewBox'), body:node.innerHTML};
        }), labels);
        return Object.fromEntries(labels.map((tex,i) => [tex,rendered[i]]));
    } finally {
        await browser.close();
    }
};
// MathJax viewBox units are 1/1000 em with the baseline at y = 0, so (x, y) is the left baseline point.
const mathLabel = (math,tex,x,y,size,color) => {
    const {viewBox,body} = math[tex];
    const [, minY, width, height] = viewBox.split(' ').map(Number);
    const scale = size/1000;
    return `<svg x="${number(x)}" y="${number(y+minY*scale)}" width="${number(width*scale)}" height="${number(height*scale)}" viewBox="${viewBox}" color="${color}" overflow="visible">${body}</svg>`;
};
const generate = math => {
    const controls = [[-4,-3],[-3,2],[2,2],[3,-2]];
    const construction = [[-4,-3],[-3,2],[0,3],[3,2],[4,-3]];
    const ph = new PhBezierCurve([point([-4.2,-2])],[point([-3.5,-1.7]),point([-2.6,1.7])]);
    ph.setOffsetCurveDistance(.45);
    ph.setOffsetCurveNumber(3);
    for (const topic of ['bezier','construction','ph']) {
        const points = topic === 'construction' ? construction : controls;
        const model = topic === 'ph' ? ph : new PolynomialBezierCurve(points.map(point));
        const curve = sample(model);
        const offsets = topic === 'ph' ? ph.getOffsetCurves().map(sample) : [];
        if (topic !== 'ph') {
            assert.deepStrictEqual(curve[0],points[0]);
            assert.deepStrictEqual(curve[curve.length-1],points[points.length-1]);
        }
        const displayed = [...curve,...offsets.flat(),...(topic === 'ph' ? [] : points)];
        const xs = displayed.map(p => p[0]), ys = displayed.map(p => p[1]);
        const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
        const scale=Math.min(290/(maxX-minX),158/(maxY-minY));
        const project=([x,y]) => [180+(x-(minX+maxX)/2)*scale,110-(y-(minY+maxY)/2)*scale];
        let body=`<rect width="360" height="220" fill="${GraphPalette.boardSurface}"/>`;
        for (let i=0;i<10;i++) body+=`<path d="M${i*40} 0V220" stroke="${GraphPalette.tick}"/>`;
        for (let i=0;i<6;i++) body+=`<path d="M0 ${i*40}H360" stroke="${GraphPalette.tick}"/>`;
        if (topic !== 'ph') body+=line(points.map(project),GraphPalette.controlPolygon,1.5,'stroke-dasharray="5 5"');
        offsets.forEach((offset,i) => {body+=line(offset.map(project),comparisonCurveColor(i),1.8,`opacity="${.9-i*.18}"`);});
        body+=line(curve.map(project),GraphPalette.primaryCurve,3.5,'stroke-linecap="round"');
        if (topic === 'construction') {
            let row=points;
            const colors=GraphPalette.constructionLevels;
            for (let level=0;row.length>1;level++) {
                const previous=row;
                row=previous.slice(1).map((p,i) => [(previous[i][0]+p[0])/2,(previous[i][1]+p[1])/2]);
                body+=line(row.map(project),colors[level],1.8);
                row.map(project).forEach(([x,y]) => {body+=`<circle cx="${number(x)}" cy="${number(y)}" r="${row.length===1 ? 5 : 3}" fill="white" stroke="${colors[level]}" stroke-width="2"/>`;});
            }
            assert(Math.abs(row[0][0]-model.eval(.5).X())<1e-12 && Math.abs(row[0][1]-model.eval(.5).Y())<1e-12);
        }
        if (topic !== 'ph') points.map(project).forEach((p,i) => {
            body+=dot(p,4)+mathLabel(math,`p_{${i}}`,p[0]+7,p[1]-7,13,GraphPalette.label);
        });
        if (topic === 'bezier') body+=`<text x="16" y="204" font-family="system-ui,sans-serif" font-size="11" fill="${GraphPalette.label}">Bézier</text>`;
        else body+=mathLabel(math,topic === 'construction' ? captions.construction : captions.ph,16,204,12,GraphPalette.label);
        save(`starting-${topic}`,360,220,body);
    }
    
    const colors=GraphPalette.basisCurves;
    const familyControls=[[24,108],[48,14],[132,14],[156,100]];
    const familyCurve=new PolynomialBezierCurve(familyControls.map(point));
    const background=`<rect width="180" height="130" rx="8" fill="${GraphPalette.boardSurface}"/>`;
    let bernstein=background+`<path d="M20 20V110H164" stroke="${GraphPalette.axis}" fill="none"/>`;
    const basis=(t,k) => [1,3,3,1][k]*t**k*(1-t)**(3-k);
    for (let i=0;i<=80;i++) assert(Math.abs([0,1,2,3].reduce((sum,k) => sum+basis(i/80,k),0)-1)<1e-12);
    for (let k=0;k<4;k++) bernstein+=line(Array.from({length:81},(_,i) => [20+144*i/80,110-88*basis(i/80,k)]),colors[k],2.3);
    save('family-basics',180,130,bernstein);
    save('family-bezier',180,130,background+line(familyControls,GraphPalette.controlPolygon,1.2,'stroke-dasharray="4 4"')+line(sample(familyCurve),GraphPalette.primaryCurve,2.8)+familyControls.map(p => dot(p)).join(''));
    let rational=background+line(familyControls,GraphPalette.controlPolygon,1.2,'stroke-dasharray="4 4"');
    [.5,2].forEach((weight,i) => {rational+=line(sample(new RationalBezierCurve(familyControls.map(point),[1,weight,weight,1])),i===0 ? GraphPalette.comparisonCurve : GraphPalette.constructionAccent);});
    save('family-rational',180,130,rational);
    // The two cubic pieces meet with the same derivative; this is a family illustration, not a specific spline preset.
    save('family-spline',180,130,background+`<path d="M15 92C35 25 60 25 88 67" stroke="${GraphPalette.primaryCurve}" stroke-width="2.8" fill="none"/><path d="M88 67C116 109 145 106 165 35" stroke="${GraphPalette.comparisonCurve}" stroke-width="2.8" fill="none"/><path d="M66 34L110 100" stroke="${GraphPalette.controlPolygon}" stroke-dasharray="4 4"/>`+dot([88,67],4.5));
    // Integral of w(t)^2, w(t)=(1,1-2t), with uniform scale and exact normal offsets.
    let familyPh=background;
    [0,7,14].forEach((offset,j) => {
        const points=Array.from({length:81},(_,i) => {
            const t=i/80,wy=1-2*t,dx=1-wy*wy,dy=2*wy,speed=1+wy*wy;
            return [40+150*(2*t*t-4*t*t*t/3)-offset*dy/speed,100-150*(2*t-2*t*t)-offset*dx/speed];
        });
        familyPh+=line(points,j===0 ? GraphPalette.primaryCurve : comparisonCurveColor(j-1),j===0 ? 2.8 : 1.7,`opacity="${1-j*.15}"`);
    });
    save('family-ph',180,130,familyPh);
    save('family-param',180,130,background+line(sample(familyCurve),GraphPalette.primaryCurve,2.8)+Array.from({length:9},(_,i) => dot(xy(familyCurve.eval(i/8)),3.5)).join(''));
};
const captions = {construction:'t = 0.5', ph:String.raw`\text{PH} \cdot d = 0.45`};
typeset([...Array.from({length:5},(_,i) => `p_{${i}}`),...Object.values(captions)]).then(generate).then(() => console.log('Generated 9 SVG illustrations; finite coordinates, endpoints, construction, and Bernstein checks passed.')).catch(error => {console.error(error); process.exitCode = 1;});
