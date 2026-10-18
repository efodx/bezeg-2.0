// Capture-only specifications for the curve-construction motion group.
// The main capture runner supplies control driving, camera handling and common evidence checks.
const {recipes} = require('./demonstration-preview-recipes.cjs');

const IDS = [
    'bernstein', 'extrapolation', 'rational', 'rational-decasteljau', 'rational-extrapolation',
    'rational-subdivision', 'circle', 'spline-cn', 'spline-c1', 'spline-c2',
    'spline-g1-symmetric', 'spline-parameterization', 'uniform-parameterization',
];

const close = (a, b, e = 1e-8) => Math.hypot(a.x - b.x, a.y - b.y) <= e;
const binomial = (n, k) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - i + 1) / i; return x; };
function checkBernsteinFamily(sample, assert) {
    const curves=sample.observed.curves,n=curves.length-1;
    assert.equal(curves.length,sample.checkpoint+1,'Bernstein degree/readout differs from function count');
    for(let k=0;k<=n;k++)for(const p of curves[k].samples){
        const expected=binomial(n,k)*p.x**k*(1-p.x)**(n-k);
        assert.ok(p.y>=-1e-8,'Bernstein basis must be nonnegative on [0,1]');
        assert.ok(Math.abs(p.y-expected)<2e-5,`Basis curve ${k} differs from its independent B_${k},${n}(t) evaluation at t=${p.x}`);
    }
    for(let i=0;i<curves[0].samples.length;i++)assert.ok(Math.abs(curves.reduce((sum,c)=>sum+c.samples[i].y,0)-1)<2e-5,'Bernstein basis family does not sum to one across the full parameter interval');
}
function checkCircleArcs(curves,count,assert){
    assert.equal(curves.length,count,'Circle piece count differs from count control');
    const endpoints=curves.map(c=>[c.samples[0],c.samples.at(-1)]);
    for(let i=0;i<endpoints.length;i++)assert.ok(close(endpoints[i][1],endpoints[(i+1)%endpoints.length][0],1e-6),'Adjacent circular arcs do not meet');
    let orientation=0,total=0;
    for(const c of curves){let advance=0,previous=Math.atan2(c.samples[0].y,c.samples[0].x);
        for(let i=0;i<c.samples.length;i++){const p=c.samples[i];assert.ok(Math.abs(Math.hypot(p.x,p.y)-3)<2e-5,'Rational arc left the radius-3 circle');if(i===0)continue;const angle=Math.atan2(p.y,p.x),delta=Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));advance+=delta;previous=angle;}
        assert.ok(Math.abs(advance)>1e-6,'Circular piece has no angular extent');if(!orientation)orientation=Math.sign(advance);assert.equal(Math.sign(advance),orientation,'Circular pieces disagree on traversal orientation');assert.ok(Math.abs(Math.abs(advance)-2*Math.PI/count)<0.01,'Circular piece does not sweep one equal arc');total+=advance;
    }
    assert.ok(Math.abs(Math.abs(total)-2*Math.PI)<0.01,'Circular arcs do not make exactly one full turn');
}
function bernstein(controls, t) {
    const n = controls.length - 1;
    return controls.reduce((p, q, k) => {
        const w = binomial(n, k) * t ** k * (1 - t) ** (n - k);
        return {x: p.x + w * q.x, y: p.y + w * q.y};
    }, {x: 0, y: 0});
}
function rational(controls, weights, t) {
    const n = controls.length - 1;
    let x = 0, y = 0, d = 0;
    controls.forEach((p, k) => {
        const w = binomial(n, k) * t ** k * (1 - t) ** (n - k) * weights[k];
        x += w * p.x; y += w * p.y; d += w;
    });
    return {x: x / d, y: y / d, denominator: d};
}
function c2Spline(controls, alpha, t) {
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const n=controls.length,spanEnds=[[controls[0],controls[2]]];
    for(let i=2;i<n-3;i++)spanEnds.push([controls[i],controls[i+1]]);
    spanEnds.push([controls[n-3],controls[n-1]]);
    const lengths=spanEnds.map(([a,b])=>distance(a,b)**alpha),total=lengths.reduce((a,b)=>a+b,0);
    let knots=[0];for(const length of lengths)knots.push(knots.at(-1)+(total>0?length/total:1/lengths.length));
    const blend=(a,b,wa,wb)=>({x:wa*a.x+wb*b.x,y:wa*a.y+wb*b.y});
    const spans=Array.from({length:n-3},()=>new Array(4));
    spans[0][0]=controls[0];spans[0][1]=controls[1];
    let du1=knots[1]-knots[0],du2=knots[2]-knots[1];
    spans[0][2]=blend(controls[1],controls[2],du2/(du1+du2),du1/(du1+du2));
    for(let l=2;l<n-3;l++){
        const a=knots[l-1]-knots[l-2],b=knots[l]-knots[l-1],c=knots[l+1]-knots[l],sum=a+b+c;
        spans[l-1][1]=blend(controls[l],controls[l+1],(b+c)/sum,a/sum);
        spans[l-1][2]=blend(controls[l],controls[l+1],c/sum,(a+b)/sum);
    }
    du1=knots.at(-2)-knots.at(-3);du2=knots.at(-1)-knots.at(-2);
    spans.at(-1)[1]=blend(controls[n-3],controls[n-2],du2/(du1+du2),du1/(du1+du2));
    for(let l=1;l<n-3;l++){
        du1=knots[l]-knots[l-1];du2=knots[l+1]-knots[l];
        const join=blend(spans[l-1][2],spans[l][1],du2/(du1+du2),du1/(du1+du2));
        spans[l-1][3]=join;spans[l][0]=join;
    }
    spans.at(-1)[2]=controls[n-2];spans.at(-1)[3]=controls[n-1];
    const u=Math.max(0,Math.min(1,t));let i=knots.findIndex((end,j)=>j>0&&u<end);if(i<0)i=knots.length-1;
    const span=Math.min(i-1,spans.length-1),local=(u-knots[span])/(knots[span+1]-knots[span]);
    return bernstein(spans[span],local);
}
function homogeneousLevels(controls, weights, t) {
    let level = controls.map((p, i) => ({x: p.x * weights[i], y: p.y * weights[i], w: weights[i]}));
    const levels = [];
    while (level.length > 1) {
        level = level.slice(0, -1).map((p, i) => ({
            x: (1 - t) * p.x + t * level[i + 1].x,
            y: (1 - t) * p.y + t * level[i + 1].y,
            w: (1 - t) * p.w + t * level[i + 1].w,
        }));
        levels.push(level.map(p => ({x: p.x / p.w, y: p.y / p.w, w: p.w})));
    }
    return levels;
}

// This observation is capture-only board inspection. It records drawable curve samples and
// point coordinates, never React state or a production window bridge.
const boardGeometry = (page, withJets = false) => page.locator('#jgbox').evaluate((container, withJets) => {
    const board = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
    const curves = Object.values(board.objects).filter(o => o.elType === 'curve' && o.visProp?.visible !== false && o.rendNode && getComputedStyle(o.rendNode).display !== 'none');
    const markerObjects=Object.values(board.objects).filter(o=>o.elType==='point'&&o.visProp?.visible!==false&&o.rendNode&&getComputedStyle(o.rendNode).display!=='none'
        &&(o.visProp.fillColor==='#a48752'||getComputedStyle(o.rendNode).fill==='rgb(164, 135, 82)'));
    const countReadouts=[...document.querySelectorAll('[role="group"][aria-labelledby]')].map(group=>({label:document.getElementById(group.getAttribute('aria-labelledby'))?.textContent?.trim(),value:group.querySelector('output')?.textContent?.trim()}));
    const continuity=Number(countReadouts.find(v=>v.label==='Stopnja zveznosti')?.value);
    const spans=withJets? (Number.isFinite(continuity)?(continuity===1?5:3):4):0;
    return {countReadouts,curves: curves.map(o => {
        const min = o.minX(), max = o.maxX();
        return {min, max, d: o.rendNode.getAttribute('d') || '', stroke: getComputedStyle(o.rendNode).stroke,
            samples: Array.from({length: 401}, (_, i) => { const t = min + (max - min) * i / 400; return {x: o.X(t), y: o.Y(t)}; })};
    }),markers:markerObjects.map(o=>({x:o.X(),y:o.Y()})),
        markerParameters:curves.length===1?markerObjects.map((_,i)=>{const min=curves[0].minX(),max=curves[0].maxX(),t=min+(max-min)*(i+1)/(markerObjects.length+1);return {x:curves[0].X(t),y:curves[0].Y(t)};}):[],
        jets:withJets&&curves.length===1?(()=>{const c=curves[0],a=c.minX(),b=c.maxX(),range=b-a,h=range*1e-4,eps=range*1e-8;return Array.from({length:spans-1},(_,j)=>{const t=a+range*(j+1)/spans,pm2={x:c.X(t-2*h),y:c.Y(t-2*h)},p0={x:c.X(t-h),y:c.Y(t-h)},p={x:c.X(t),y:c.Y(t)},p1={x:c.X(t+h),y:c.Y(t+h)},pp2={x:c.X(t+2*h),y:c.Y(t+2*h)},leftLimit={x:c.X(t-eps),y:c.Y(t-eps)},rightLimit={x:c.X(t+eps),y:c.Y(t+eps)};return {t:(j+1)/spans,p,leftLimit,rightLimit,left:{x:(p.x-p0.x)/h,y:(p.y-p0.y)/h},right:{x:(p1.x-p.x)/h,y:(p1.y-p.y)/h},left2:{x:(p.x-2*p0.x+pm2.x)/h**2,y:(p.y-2*p0.y+pm2.y)/h**2},right2:{x:(pp2.x-2*p1.x+p.x)/h**2,y:(pp2.y-2*p1.y+p.y)/h**2}};});})():[]};
}, withJets);

function restoreControlPoint(index) {
    return async (page, ctx) => {
        const point=ctx.points[index];
        if(!point)throw new Error(`Missing control point ${index} for exact restore`);
        const screen=await page.locator('#jgbox').evaluate((container,{id,x,y})=>{
            const board=Object.values(window.JXG.boards).find(b=>b.container==='jgbox'),rect=container.getBoundingClientRect(),obj=board.objects[id];
            const at=(px,py)=>({x:rect.left+board.origin.scrCoords[1]+board.unitX*px,y:rect.top+board.origin.scrCoords[2]-board.unitY*py});
            return {current:at(obj.X(),obj.Y()),start:at(x,y)};
        },{id:point.id,x:point.x,y:point.y});
        await page.mouse.move(screen.current.x,screen.current.y);await page.mouse.down();
        await page.mouse.move(screen.start.x,screen.start.y,{steps:8});await page.mouse.up();await page.waitForTimeout(40);
        const restored=await page.locator('#jgbox').evaluate((container,id)=>{
            const board=Object.values(window.JXG.boards).find(b=>b.container==='jgbox'),p=board.objects[id];return {x:p.X(),y:p.Y()};
        },point.id);
        if(Math.hypot(restored.x-point.x,restored.y-point.y)>1e-6)throw new Error(`Pointer restore missed the exact start point: ${JSON.stringify(restored)}`);
    };
}

function assertDraggedPoint(sample, first, index, label, assert) {
    const controls=sample.points.filter(p=>p.draggable),original=first.points.filter(p=>p.draggable),moved=original[index];
    const actual=controls.find(p=>p.id===moved?.id);
    assert.ok(actual,`${label}: moved control point disappeared`);
    assert.ok(Math.hypot(actual.x-sample.target.x,actual.y-sample.target.y)<0.04,`${label}: pointer target did not move the selected control at frame ${sample.index}`);
    for(let i=0;i<original.length;i++)if(i!==index){const other=controls.find(p=>p.id===original[i].id);assert.ok(other&&close(other,original[i],1e-8),`${label}: untouched control ${i} moved at ${sample.index}: expected ${JSON.stringify(original[i])}, got ${JSON.stringify(other)}`);}
    if(sample.index===47){assert.ok(Math.hypot(actual.x-moved.x,actual.y-moved.y)>0.1,`${label}: control did not reach its midpoint excursion`);assert.notEqual(sample.curvePathHash,first.curvePathHash,`${label}: curve path did not change during the midpoint drag`);}
    if(sample.index===95){assert.ok(close(actual,moved,1e-8),`${label}: exact restore did not return the selected control`);assert.equal(sample.capture.sha256,first.capture.sha256,`${label}: final frame differs from recipe frame`);}
}

function checkRationalCurve(sample, weights, domain, label, assert) {
    const controls = sample.controls.map(({x, y}) => ({x, y}));
    const passing = sample.observed.curves.filter(curve => curve.samples.every((p, i) => {
        const t = domain[0] + (domain[1] - domain[0]) * i / (curve.samples.length - 1);
        const expected = rational(controls, weights, t);
        return Number.isFinite(expected.denominator) && Math.abs(expected.denominator) > 1e-8 && close(p, expected, 2e-5);
    }));
    assert.ok(passing.length > 0, `${label}: no rendered curve matches the independent rational Bernstein evaluation at frame ${sample.index}`);
}

const motionSpecs = {
    bernstein: {
        mode: 'discrete-exact-steps', checkpoints: [
            {value:3,actions:[]},{value:4,actions:[{kind:'button',label:'Povečaj število',count:1}]},{value:3,actions:[]},
        ], holds: [32, 32, 32],
        observe: boardGeometry,
        checkStep(sample, first, spec) {
            checkBernsteinFamily(sample,spec._assert);
        },
        invariants: ['Degree is the displayed count minus one; all basis curves remain nonnegative on [0,1]', 'First and last captures return to degree 3'],
    },
    extrapolation: {
        mode: 'parameter-sweep', controlCount: 4, control: {label: 'Parameter ekstrapolacije t', kind: 'range'},
        sweep: {waypoints: [1.2, 1.3, 1.2], step: 0.005, start: 1.2,
            readout: {read: ({range}) => range.getAttribute('aria-valuetext'), matches: (s, v) => Math.abs(Number(String(s).replace(',', '.')) - v) < 0.011},
            observe: boardGeometry,
            check(sample, previous, first, spec) {
                const assert = spec._assert, t = sample.actual.input, P = sample.controls.map(({x,y}) => ({x,y}));
                const target = bernstein(P, t);
                const near = sample.points.filter(p => !p.draggable).some(p => close(p, target, 1e-7));
                assert.ok(near, `Extrapolation point differs from independent B(t) at frame ${sample.index}`);
                assert.ok(close(bernstein(P, 1), P[3], 1e-9), 'Extension must join base curve at t=1');
                const extension=sample.observed.curves.some(c=>c.samples.every((p,i)=>close(p,bernstein(P,t*i/(c.samples.length-1)),3e-5)));
                assert.ok(extension,`Rendered extension is not the independent reparameterization B(tu) at frame ${sample.index}`);
                if(Math.abs(t-first.actual.input)>1e-9)assert.notEqual(sample.curvePathHash,first.curvePathHash,'Polynomial extrapolation SVG path did not update when t changed');
            }},
        invariants: ['Extrapolation construction point equals polynomial Bernstein B(t), including t > 1', 'Original four controls stay fixed'],
    },
    rational: {
        mode: 'pointer-drag', controlCount: 4, crf:16,
        start: ctx => ctx.points.find(p => p.name === 'p1') || ctx.points[1],
        path: (p, d) => ({x: p.x + 0.55 * d, y: p.y + 0.65 * d}),
        restore:restoreControlPoint(1),
        observe: boardGeometry,
        check(sample, previous, first, spec) {
            const controls=sample.points.filter(p=>p.draggable).map(({x,y})=>({x,y}));
            assertDraggedPoint(sample,first,1,'Rational Bézier drag',spec._assert);
            checkRationalCurve({...sample, controls}, [1,2,1,1], [0,1], 'Rational Bézier', spec._assert);
            const original=first.points.filter(p=>p.draggable),actual=sample.points.filter(p=>p.draggable);
            for(let i=0;i<original.length;i++)if(i!==1)spec._assert.ok(close(actual.find(p=>p.id===original[i].id),original[i],1e-9),'Untouched rational control point moved');
            if (sample.index === 95) spec._assert.equal(sample.capture.sha256, first.capture.sha256, 'Rational drag must return to recipe frame');
        },
        encoderBudget:'CRF 16 after CRF 10 exceeded the 300 KiB limit at 322357 bytes; final diagnostic encode must stay below 307200 bytes',
        invariants: ['Rendered curve agrees with independent weighted Bernstein evaluation with weights [1,2,1,1]', 'Only one control point moves and the weights remain fixed'],
    },
    'rational-decasteljau': {
        mode: 'parameter-sweep', controlCount: 4, control: {label: 'Parameter t', kind:'range'},
        sweep: {waypoints:[0.5,0.7,0.3,0.5],step:0.01,start:0.5,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.011},
            observe:boardGeometry,
            check(sample, previous, first, spec) {
                const assert=spec._assert, P=sample.controls.map(({x,y})=>({x,y})), t=sample.actual.input;
                const target=rational(P,[1,2,1,1],t), curves=sample.observed.curves.filter(c=>c.samples.length===401);
                assert.ok(Math.abs(target.denominator)>1e-8,'Rational denominator must remain nonzero');
                assert.equal(curves.length,1,'Rational interpolation preview must show one growing curve prefix');
                const curve=curves[0];
                assert.ok(Math.abs(curve.min)<1e-10&&Math.abs(curve.max-t)<1e-10,`Rational prefix parameter domain must be [0,t], got [${curve.min},${curve.max}] at t=${t}`);
                for(let i=0;i<curve.samples.length;i++){
                    const u=curve.min+(curve.max-curve.min)*i/(curve.samples.length-1),expected=rational(P,[1,2,1,1],u);
                    assert.ok(close(curve.samples[i],expected,3e-5),`Visible curve prefix differs from independent rational R(u) at u=${u}`);
                }
                assert.ok(close(curve.samples.at(-1),target,3e-5),`Growing rational prefix must end at R(t): ${JSON.stringify(target)}`);
                if(Math.abs(t-first.actual.input)>1e-9)assert.notEqual(sample.curvePathHash,first.curvePathHash,'Rational prefix SVG path did not update when t changed');
            }},
        invariants:['At each slider value t, the visible curve is exactly the rational Bernstein prefix R([0,t]) with weights [1,2,1,1]', 'The prefix ends at independently evaluated R(t), with a nonzero denominator; control points and weights stay fixed'],
    },
    'rational-extrapolation': {
        mode:'parameter-sweep',controlCount:4,control:{label:'Parameter ekstrapolacije t',kind:'range'},
        sweep:{waypoints:[1.2,1.3,1.2],step:0.005,start:1.2,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.011},
            observe:boardGeometry,
            check(sample,previous,first,spec){
                const assert=spec._assert,P=sample.controls.map(({x,y})=>({x,y})),t=sample.actual.input;
                const expected=rational(P,[1,2,1,1],t);
                assert.ok(Number.isFinite(expected.denominator)&&Math.abs(expected.denominator)>1e-8,`Invalid rational denominator at t=${t}`);
                const extension=sample.observed.curves.some(c=>c.samples.every((p,i)=>close(p,rational(P,[1,2,1,1],t*i/(c.samples.length-1)),3e-5)));
                assert.ok(extension,`Rendered rational extension is not the independent reparameterization R(tu) at frame ${sample.index}`);
                const construction=sample.points.filter(p=>!p.draggable).some(p=>close(p,expected,1e-7));
                assert.ok(construction,`Rational extension point differs from weighted Bernstein at frame ${sample.index}`);
                if(Math.abs(t-first.actual.input)>1e-9)assert.notEqual(sample.curvePathHash,first.curvePathHash,'Rational extrapolation SVG path did not update when t changed');
            }},
        invariants:['Extension point agrees with independent rational evaluation for t > 1', 'Weights and controls remain fixed; denominator stays nonzero'],
    },
    'rational-subdivision': {
        mode:'parameter-sweep',controlCount:4,control:{label:'Parameter subdivizije t',kind:'range'},
        sweep:{waypoints:[0.5,0.745,0.5],step:0.0098,origin:0.01,start:0.5,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.011},
            observe:boardGeometry,
            check(sample,previous,first,spec){
                const assert=spec._assert,P=sample.controls.map(({x,y})=>({x,y})),t=sample.actual.input,curves=sample.observed.curves;
                const candidates=curves.filter(c=>c.samples.length===401);
                const split=rational(P,[1,2,1,1],t);
                const matches=(p,q)=>close(p,q,2e-5);
                const pieces=candidates.filter(c=>matches(c.samples[0],P[0])||matches(c.samples.at(-1),P[3]));
                assert.ok(pieces.length>=2,`Both rational subdivision portions missing at frame ${sample.index}`);
                assert.ok(pieces.some(c=>c.samples.some(p=>matches(p,split))),`Split point is absent from both rational pieces at frame ${sample.index}`);
                for(let j=0;j<=20;j++) {
                    const s=j/20;
                    const left=rational(P,[1,2,1,1],t*s), right=rational(P,[1,2,1,1],t+(1-t)*s);
                    assert.ok(pieces.some(c=>matches(c.samples[j*20],left)),`Left portion leaves original rational curve at frame ${sample.index}`);
                    assert.ok(pieces.some(c=>matches(c.samples[j*20],right)),`Right portion leaves original rational curve at frame ${sample.index}`);
                }
            }},
        invariants:['Both coloured portions equal reparameterized intervals of the original rational curve', 'Split point equals rational B(t), with original controls and weights fixed'],
    },
    circle: {
        mode:'discrete-exact-steps',checkpoints:[
            {value:3,actions:[]},{value:4,actions:[{kind:'button',label:'Povečaj število',count:1}]},{value:3,actions:[]},
        ],holds:[32,32,32],observe:boardGeometry,
        checkStep(sample,first,spec){
            const assert=spec._assert,curves=sample.observed.curves.filter(c=>c.samples.length===401);
            checkCircleArcs(curves,sample.checkpoint,assert);
        },
        invariants:['Count equals the displayed arc count; arcs meet in cyclic order and lie on the radius-3 circle'],
    },
    'spline-cn': {
        mode:'discrete-exact-steps',checkpoints:[
            {value:1,actions:[]},{value:0,actions:[{kind:'button',label:'Zmanjšaj število',group:'Stopnja zveznosti',count:1}]},{value:1,actions:[]},
        ],holds:[32,32,32],observe:page=>boardGeometry(page,true),
        checkStep(sample,first,spec){
            const assert=spec._assert,curve=sample.observed.curves[0],spans=sample.checkpoint===1?5:3;
            assert.ok(curve,'Cn spline curve missing');
            const continuity=sample.observed.countReadouts.find(v=>v.label==='Stopnja zveznosti');
            const degree=sample.observed.countReadouts.find(v=>v.label==='Stopnja zlepka');
            assert.equal(Number(continuity?.value),sample.checkpoint,'Displayed continuity order must match the exact checkpoint');
            assert.equal(Number(degree?.value),2,'Cn degree must remain two at both checkpoints');
            if(sample.checkpoint===0)assert.ok(curve.samples.some((p,i)=>!close(p,first.observed.curves[0].samples[i],1e-4)),'Changing C1 to C0 must alter the computed spline geometry');
            for(let j=1;j<spans;j++){
                const joinT=j/spans,jet=sample.observed.jets.find(v=>Math.abs(v.t-joinT)<1e-12);
                assert.ok(jet&&Number.isFinite(jet.p.x)&&Number.isFinite(jet.p.y),`Cn spline join ${j} is not finite`);
                assert.ok(close(jet.leftLimit,jet.rightLimit,1e-5),`Cn C0 positional relation fails at exact join ${j}/${spans}`);
                if(sample.checkpoint===1)assert.ok(Math.hypot(jet.left.x-jet.right.x,jet.left.y-jet.right.y)<0.03,`C1 derivative relation fails at join ${j}`);
            }
        },
        invariants:['The degree-2 spline preserves shared joins; C1 order is present at the selected continuity order'],
    },
    'spline-c1': {
        mode:'pointer-drag',controlCount:6,
        start:ctx=>ctx.points.find(p=>p.id===ctx.points[0].id),path:(p,d)=>({x:p.x+0.55*d,y:p.y+0.45*d}),
        restore:restoreControlPoint(0),
        observe:page=>boardGeometry(page,true),
        check(sample,previous,first,spec){
            assertDraggedPoint(sample,first,0,'C1 spline drag',spec._assert);
            const assert=spec._assert,curve=sample.observed.curves[0];
            assert.ok(curve,'C1 spline curve missing');
            for(const j of [1,2,3]){const jet=sample.observed.jets.find(v=>Math.abs(v.t-j/4)<1e-12);assert.ok(jet,`C1 join ${j} missing`);assert.ok(close(jet.leftLimit,jet.rightLimit,1e-5),`C1 positional relation fails at join ${j}`);assert.ok(Math.hypot(jet.left.x-jet.right.x,jet.left.y-jet.right.y)<0.03,`C1 first-derivative relation fails at join ${j}`);}
        },
        invariants:['Dragged endpoint changes the spline while the constructed join retains C1 positional and first-derivative continuity'],
    },
    'spline-c2': {
        mode:'pointer-drag',controlCount:7,
        start:ctx=>ctx.points[0],path:(p,d)=>({x:p.x+0.45*d,y:p.y+0.35*d}),restore:restoreControlPoint(0),observe:page=>boardGeometry(page,true),
        check(sample,previous,first,spec){
            assertDraggedPoint(sample,first,0,'C2 spline drag',spec._assert);
            const assert=spec._assert,curve=sample.observed.curves[0];assert.ok(curve,'C2 spline curve missing');
            for(const j of [1,2,3]){const jet=sample.observed.jets.find(v=>Math.abs(v.t-j/4)<1e-12);assert.ok(jet,`C2 join ${j} missing`);assert.ok(close(jet.leftLimit,jet.rightLimit,1e-5),`C2 positional relation fails at join ${j}`);assert.ok(Math.hypot(jet.left.x-jet.right.x,jet.left.y-jet.right.y)<0.03,`C2 first derivatives fail at join ${j}`);assert.ok(Math.hypot(jet.left2.x-jet.right2.x,jet.left2.y-jet.right2.y)<0.5,`C2 second derivatives fail at join ${j}`);}
        },
        invariants:['Dragged control changes the curve while the shared join retains C2 position, first and second derivative constraints'],
    },
    'spline-g1-symmetric': {
        mode:'parameter-sweep',controlCount:6,control:{label:'Parameter b 1',kind:'range'},
        sweep:{waypoints:[0.1962,0.8038,0.1962],step:0.0098,origin:0.01,start:0.1962,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.011},observe:boardGeometry,
            check(sample,previous,first,spec){
                const assert=spec._assert,b=sample.actual.input,P=sample.controls.map(({x,y})=>({x,y}));
                const computed=sample.points.filter(p=>!p.draggable);
                const expected={x:(1-b)*P[1].x+b*P[2].x,y:(1-b)*P[1].y+b*P[2].y};
                assert.ok(computed.some(p=>close(p,expected,1e-8)),'Computed G1 join point differs from beta construction');
                const v={x:expected.x-P[1].x,y:expected.y-P[1].y},w={x:P[2].x-expected.x,y:P[2].y-expected.y};
                assert.ok(Math.abs(v.x*w.y-v.y*w.x)<1e-9 && v.x*w.x+v.y*w.y>0,'G1 legs must be collinear and point in the same direction');
            }},
        invariants:['The computed join point matches the beta construction and tangent legs stay positively collinear'],
    },
    'spline-parameterization': {
        mode:'parameter-sweep',controlCount:9,control:{label:'Parameter α',kind:'range'},crf:16,
        sweep:{waypoints:[0.7,0.3,0.7],step:0.01,start:0.7,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.011},observe:boardGeometry,
            check(sample,previous,first,spec){
                const assert=spec._assert;
                const markers=sample.observed.markers;
                assert.equal(markers.length,first.observed.markers.length,'Marker count changed during parameterization');
                const curve=sample.observed.curves[0],controls=sample.controls.map(({x,y})=>({x,y})),alpha=sample.actual.input;
                assert.ok(curve&&curve.samples.length===401,'C2 spline curve samples are missing');
                for(let i=0;i<curve.samples.length;i++)assert.ok(close(curve.samples[i],c2Spline(controls,alpha,i/400),3e-4),`Rendered spline differs from independent C2 chord-knot evaluation at t=${i/400}`);
                let markersMoved=false;
                for(let i=0;i<markers.length;i++){const expected=c2Spline(controls,alpha,(i+1)/(markers.length+1));assert.ok(close(markers[i],expected,2e-7),`Marker ${i} differs from independent C2 spline evaluation at its global parameter`);if(!close(markers[i],first.observed.markers[i],1e-4))markersMoved=true;}
                if(Math.abs(alpha-0.7)>0.05){assert.ok(markersMoved,'Nonneutral alpha did not move any sample marker');assert.ok(curve.samples.some((p,i)=>!close(p,first.observed.curves[0].samples[i],1e-3)),'Changing alpha did not change the chord-knot spline shape');}
            }},
        encoderBudget:'CRF 16 instead of 10 after CRF 10 measured 392109 bytes; the full alpha cycle and all markers remain visible',
        invariants:['Free control points stay fixed; rendered C2 spline and its markers agree with the independent alpha chord-knot evaluator at global parameters k/(n+1)'],
    },
    'uniform-parameterization': {
        mode:'parameter-sweep',controlCount:0,control:{label:'Število točk',kind:'range'},
        sweep:{waypoints:[10,22,10],step:1,start:10,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.51},observe:boardGeometry,
            check(sample,previous,first,spec){
            const assert=spec._assert,curve=sample.observed.curves.find(c=>c.samples.length===401),markers=sample.observed.markers;
            assert.ok(curve,'Uniform parameterization curve missing');
            assert.equal(markers.length,Math.round(sample.actual.input),'Marker count must equal the number-of-points control');
            assert.equal(sample.curvePathHash,first.curvePathHash,'Changing the sample count must preserve the PH curve');
            const arc=[];let length=0;
            for(let i=1;i<curve.samples.length;i++){length+=Math.hypot(curve.samples[i].x-curve.samples[i-1].x,curve.samples[i].y-curve.samples[i-1].y);arc.push(length);}
            const fractions=markers.map(m=>{let best=Infinity,pos=0;for(let i=0;i<curve.samples.length-1;i++){const a=curve.samples[i],b=curve.samples[i+1],dx=b.x-a.x,dy=b.y-a.y,seg=dx*dx+dy*dy,s=seg?Math.max(0,Math.min(1,((m.x-a.x)*dx+(m.y-a.y)*dy)/seg)):0,q={x:a.x+s*dx,y:a.y+s*dy},dist=Math.hypot(m.x-q.x,m.y-q.y);if(dist<best){best=dist;pos=(arc[i-1]||0)+s*Math.sqrt(seg);}}assert.ok(best<0.02,'Uniform marker leaves the independently sampled curve');return pos/length;});
            for(let i=0;i<fractions.length;i++)assert.ok(Math.abs(fractions[i]-(i+1)/(markers.length+1))<0.002,`Uniform marker ${i} is not at its equal-arc-length fraction including endpoint gaps`);
        }},
        invariants:['The PH curve remains fixed while the supported sample-count slider grows and contracts the marker set; markers stay on the curve at equal arc-length fractions including endpoints'],
    },
};

function createCurveMotionSpecs(helpers = {}) {
    const assert = helpers.assert || require('node:assert/strict');
    const cloned = Object.fromEntries(IDS.map(id => [id, {...motionSpecs[id]}]));
    for (const spec of Object.values(cloned)) {
        spec._assert = assert;
        spec.settle ||= page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        if (spec.sweep) spec.sweep = {...spec.sweep, _assert: assert};
        if (spec.observe && spec.mode === 'parameter-sweep') spec.sweep.observe = spec.observe;
        if (spec.mode === 'parameter-sweep') {
            spec.schedule = {kind:'piecewise-sin2',waypoints:spec.sweep.waypoints,step:spec.sweep.step,origin:spec.sweep.origin??0,
                phase:'clamp((frame-12)/71)',zeroDisplacementFrames:'0-12 and 83-95',movingFrames:'13-82',
                legs:`${spec.sweep.waypoints.length-1} eased legs using (1 - cos πx)/2`,input:`keyboard stepping on ${spec.control.label}`};
        } else if (spec.mode === 'discrete-exact-steps') {
            spec.schedule = {kind:'discrete-exact-steps',checkpoints:spec.checkpoints.map(c=>c.value),holds:spec.holds,
                input:'fresh route per exact checkpoint, reached by supported count control'};
        } else {
            spec.schedule = {kind:'sin2-out-and-back',phase:'clamp((frame-12)/71)',displacement:'sin²(π·phase)',
                zeroDisplacementFrames:'0-12 and 83-95',movingFrames:'13-82',press:13,release:83,
                waypoints:'start → supported pointer path → exact original coordinate',grid:'pointer coordinates mapped through fixed board camera',restore:'supported pointer drag restores and verifies the original indexed x/y values'};
        }
        spec.encoderBudget ||= 'CRF 10 default; final diagnostic encode must remain under 300 KiB; lower CRF quality only if the measured file exceeds the limit';
    }
    return cloned;
}

module.exports = {createCurveMotionSpecs, IDS, bernstein, rational, homogeneousLevels, c2Spline, checkBernsteinFamily, checkCircleArcs};
