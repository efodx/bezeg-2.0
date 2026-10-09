// Regenerate versioned decorative SVGs: node scripts/generate-demonstration-previews.cjs.
// Uses the existing models only at generation time; the catalog loads static assets.
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
const output = path.join(root, 'src/images/demonstrations');
fs.mkdirSync(output, {recursive:true});
const point = ([x,y]) => new PointImpl(x,y);
const xy = p => [p.X(),p.Y()];
const sample = curve => Array.from({length:101}, (_,i) => xy(curve.eval(i/100)));
const number = value => {assert(Number.isFinite(value), 'Preview coordinates must be finite'); return value.toFixed(2);};
const d = points => points.map(([x,y],i) => `${i ? 'L' : 'M'}${number(x)},${number(y)}`).join(' ');
const line = (points,color,width=2.5,extra='') => `<path d="${d(points)}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const dot = ([x,y],radius=3.2,color='#b9792f') => `<circle cx="${number(x)}" cy="${number(y)}" r="${radius}" fill="${color}" stroke="white" stroke-width="1.5"/>`;
const svg = (width,height,body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>\n`;
const save = (name,width,height,body) => fs.writeFileSync(path.join(output,`${name}.svg`),svg(width,height,body));
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
    let body='<rect width="360" height="220" fill="#f8faf4"/>';
    for (let i=0;i<10;i++) body+=`<path d="M${i*40} 0V220" stroke="#e9ede3"/>`;
    for (let i=0;i<6;i++) body+=`<path d="M0 ${i*40}H360" stroke="#e9ede3"/>`;
    if (topic !== 'ph') body+=line(points.map(project),'#8d9c7d',1.5,'stroke-dasharray="5 5"');
    offsets.forEach((offset,i) => {body+=line(offset.map(project),'#819866',1.8,`opacity="${.9-i*.18}"`);});
    body+=line(curve.map(project),'#5066b3',3.5,'stroke-linecap="round"');
    if (topic === 'construction') {
        let row=points;
        const colors=['#be7f35','#b26894','#648d84','#243b2b'];
        for (let level=0;row.length>1;level++) {
            const previous=row;
            row=previous.slice(1).map((p,i) => [(previous[i][0]+p[0])/2,(previous[i][1]+p[1])/2]);
            body+=line(row.map(project),colors[level],1.8);
            row.map(project).forEach(([x,y]) => {body+=`<circle cx="${number(x)}" cy="${number(y)}" r="${row.length===1 ? 5 : 3}" fill="white" stroke="${colors[level]}" stroke-width="2"/>`;});
        }
        assert(Math.abs(row[0][0]-model.eval(.5).X())<1e-12 && Math.abs(row[0][1]-model.eval(.5).Y())<1e-12);
    }
    if (topic !== 'ph') points.map(project).forEach((p,i) => {
        body+=dot(p,4)+`<text x="${number(p[0]+8)}" y="${number(p[1]-7)}" font-family="system-ui,sans-serif" font-size="11" fill="#526152">p${i}</text>`;
    });
    body+=`<text x="16" y="204" font-family="system-ui,sans-serif" font-size="11" fill="#66715f">${topic === 'construction' ? 't = 0.5' : topic === 'ph' ? 'PH · d = 0.45' : 'Bézier'}</text>`;
    save(`starting-${topic}`,360,220,body);
}

const colors=['#718b55','#5066b3','#bb7f3a','#9e6d9b'];
const familyControls=[[24,108],[48,14],[132,14],[156,100]];
const familyCurve=new PolynomialBezierCurve(familyControls.map(point));
const background='<rect width="180" height="130" rx="8" fill="#f6f8f0"/>';
let bernstein=background+'<path d="M20 20V110H164" stroke="#c7d1bc" fill="none"/>';
const basis=(t,k) => [1,3,3,1][k]*t**k*(1-t)**(3-k);
for (let i=0;i<=80;i++) assert(Math.abs([0,1,2,3].reduce((sum,k) => sum+basis(i/80,k),0)-1)<1e-12);
for (let k=0;k<4;k++) bernstein+=line(Array.from({length:81},(_,i) => [20+144*i/80,110-88*basis(i/80,k)]),colors[k],2.3);
save('family-basics',180,130,bernstein);
save('family-bezier',180,130,background+line(familyControls,'#a5b196',1.2,'stroke-dasharray="4 4"')+line(sample(familyCurve),'#5066b3',2.8)+familyControls.map(p => dot(p)).join(''));
let rational=background+line(familyControls,'#a5b196',1.2,'stroke-dasharray="4 4"');
[.5,2].forEach((weight,i) => {rational+=line(sample(new RationalBezierCurve(familyControls.map(point),[1,weight,weight,1])),colors[i]);});
save('family-rational',180,130,rational);
// The two cubic pieces meet with the same derivative; this is a family illustration, not a specific spline preset.
save('family-spline',180,130,background+'<path d="M15 92C35 25 60 25 88 67" stroke="#5066b3" stroke-width="2.8" fill="none"/><path d="M88 67C116 109 145 106 165 35" stroke="#718b55" stroke-width="2.8" fill="none"/><path d="M66 34L110 100" stroke="#b4bfaa" stroke-dasharray="4 4"/>'+dot([88,67],4.5));
// Integral of w(t)^2, w(t)=(1,1-2t), with uniform scale and exact normal offsets.
let familyPh=background;
[0,7,14].forEach((offset,j) => {
    const points=Array.from({length:81},(_,i) => {
        const t=i/80,wy=1-2*t,dx=1-wy*wy,dy=2*wy,speed=1+wy*wy;
        return [40+150*(2*t*t-4*t*t*t/3)-offset*dy/speed,100-150*(2*t-2*t*t)-offset*dx/speed];
    });
    familyPh+=line(points,j===0 ? '#5066b3' : '#819866',j===0 ? 2.8 : 1.7,`opacity="${1-j*.15}"`);
});
save('family-ph',180,130,familyPh);
save('family-param',180,130,background+line(sample(familyCurve),'#5066b3',2.8)+Array.from({length:9},(_,i) => dot(xy(familyCurve.eval(i/8)),3.5)).join(''));
console.log('Generated 9 SVG illustrations; finite coordinates, endpoints, construction, and Bernstein checks passed.');
