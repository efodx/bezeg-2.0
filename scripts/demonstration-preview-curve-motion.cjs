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
function rationalSubdivision(controls, weights, t) {
    const levels = homogeneousLevels(controls, weights, t);
    const left = {controls:[controls[0], ...levels.map(level => level[0])], weights:[weights[0], ...levels.map(level => level[0].w)]};
    const right = {controls:[...levels.slice().reverse().map(level => level.at(-1)), controls.at(-1)], weights:[...levels.slice().reverse().map(level => level.at(-1).w), weights.at(-1)]};
    return [left, right];
}

function hasVisiblePoint(points, expected, tolerance = 1e-4) {
    return points.some(point => close(point, expected, tolerance));
}
function hasVisibleSegment(segments, a, b, tolerance = 1e-4) {
    return segments.some(segment => (close(segment.a, a, tolerance) && close(segment.b, b, tolerance))
        || (close(segment.a, b, tolerance) && close(segment.b, a, tolerance)));
}
function assertVisibleConstruction(observed, points, legs, label, assert) {
    for (const [index, point] of points.entries()) assert.ok(hasVisiblePoint(observed.visiblePoints, point),
        `${label}: required computed construction point ${index + 1} is not visible at its expected coordinate`);
    for (const [index, [a, b]] of legs.entries()) assert.ok(hasVisibleSegment(observed.visibleSegments, a, b),
        `${label}: required construction leg ${index + 1} is not visible between its expected endpoints`);
}
function assertBothSpansChanged(before, after, assert, threshold = 1e-4) {
    assert.equal(before.length, after.length, 'C2 comparison needs matching global spline samples');
    for (const [label, start, end] of [['left', 100, 200], ['right', 200, 300]]) {
        const response = after.slice(start, end + 1).some((point, i) => !close(point, before[start + i], threshold));
        assert.ok(response, `C2 central drag must change the ${label} adjacent span (${start/400}–${end/400})`);
    }
}

function checkRationalSubdivision(sample, first, assert) {
    const controls = first.points.filter(point => point.draggable).map(({x,y}) => ({x,y}));
    const weights = [1,2,1,1], t = 0.5, children = rationalSubdivision(controls, weights, t);
    const curves = sample.observed.curves.filter(curve => curve.samples.length === 401 && curve.max-curve.min > 1e-9);
    assert.equal(curves.length, 2, `Exact rational subdivision must show two child curves, found ${curves.length}`);
    // Capture presentation deliberately omits colliding labels. Verify all source
    // labels numerically, and require each child's distinguishing inner weight on screen.
    const remainingLabels = [...(sample.observed.declaredWeightLabels || sample.observed.weightLabels)];
    for (const [childIndex, child] of children.entries()) {
        assert.ok(sample.observed.weightLabels.some(text => {
            const match=text.match(/=\s*(-?\d+(?:[.,]\d+)?)/);
            return match && Math.abs(Number(match[1].replace(',','.'))-child.weights[1])<=.011;
        }), `Rational subdivision child ${childIndex+1} distinguishing inner weight must be visible`);
        for (const [i, point] of child.controls.entries()) assert.ok(hasVisiblePoint(sample.observed.visiblePoints, point),
            `Rational subdivision child ${childIndex + 1} control ${i} is not visible at its exact homogeneous coordinate`);
        for (let i = 0; i < child.controls.length - 1; i++) assert.ok(hasVisibleSegment(sample.observed.visibleSegments, child.controls[i], child.controls[i + 1]),
            `Rational subdivision child ${childIndex + 1} supporting polygon edge ${i} is not visible`);
        for (const [i, weight] of child.weights.entries()) {
            const labelIndex = remainingLabels.findIndex(text => {
                const match = text.match(/=\s*(-?\d+(?:[.,]\d+)?)/);
                return match && Math.abs(Number(match[1].replace(',', '.')) - weight) <= 0.011;
            });
            assert.ok(labelIndex >= 0, `Rational subdivision child ${childIndex + 1} weight w${i}=${weight.toFixed(2)} is not visibly labeled`);
            remainingLabels.splice(labelIndex, 1);
        }
    }
    const matchesChild = (curve, child) => curve.samples.every((point, i) => close(point, rational(child.controls, child.weights, i/400), 3e-5));
    for (const child of children) assert.ok(curves.some(curve => matchesChild(curve, child)), 'Visible child does not match its independently subdivided control points and weights');
    for (let j = 0; j <= 20; j++) {
        const s = j/20;
        assert.ok(curves.some(curve => close(curve.samples[j*20], rational(controls, weights, t*s), 3e-5)), `Left child fails exact parent reparameterization at s=${s}`);
        assert.ok(curves.some(curve => close(curve.samples[j*20], rational(controls, weights, t+(1-t)*s), 3e-5)), `Right child fails exact parent reparameterization at s=${s}`);
    }
}

// This observation is capture-only board inspection. It records drawable curve samples and
// point coordinates, never React state or a production window bridge.
const boardGeometry = (page, withJets = false) => page.locator('#jgbox').evaluate((container, withJets) => {
    const board = Object.values(window.JXG.boards).find(b => b.container === container.id || b.containerObj === container);
    const curves = Object.values(board.objects).filter(o => o.elType === 'curve' && o.visProp?.visible !== false && o.rendNode && getComputedStyle(o.rendNode).display !== 'none');
    const markerObjects=Object.values(board.objects).filter(o=>o.elType==='point'&&o.visProp?.visible!==false&&o.rendNode&&getComputedStyle(o.rendNode).display!=='none'
        &&(o.visProp.fillColor==='#a48752'||getComputedStyle(o.rendNode).fill==='rgb(164, 135, 82)'));
    const visibleObjects=Object.values(board.objects).filter(o=>o.visProp?.visible!==false&&o.rendNode&&getComputedStyle(o.rendNode).display!=='none');
    const visiblePoints=visibleObjects.filter(o=>o.elType==='point'&&typeof o.X==='function'&&typeof o.Y==='function')
        .map(o=>({x:o.X(),y:o.Y()}));
    const visibleSegments=visibleObjects.filter(o=>(o.elType==='segment'||o.elType==='line')&&o.point1&&o.point2
        &&typeof o.point1.X==='function'&&typeof o.point2.X==='function')
        .map(o=>({a:{x:o.point1.X(),y:o.point1.Y()},b:{x:o.point2.X(),y:o.point2.Y()}}));
    const declaredWeightLabels=[...container.querySelectorAll('.smart-label-point2')].map(el=>el.textContent||'');
    const weightLabels=[...container.querySelectorAll('.smart-label-point2')]
        .filter(el=>getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0)
        .map(el=>el.textContent||'');
    const countReadouts=[...document.querySelectorAll('[role="group"][aria-labelledby]')].map(group=>({label:document.getElementById(group.getAttribute('aria-labelledby'))?.textContent?.trim(),value:group.querySelector('output')?.textContent?.trim()}));
    const continuity=Number(countReadouts.find(v=>v.label==='Stopnja zveznosti')?.value);
    const spans=withJets? (Number.isFinite(continuity)?(continuity===1?5:3):4):0;
    return {countReadouts,visiblePoints,visibleSegments,weightLabels,declaredWeightLabels,curves: curves.map(o => {
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
        conceptStatus: 'blocked', dependency: 'Supported controls change degree but expose no shared probe/value readout for the basis functions.',
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
        sweep: {waypoints: [1, 1.2, 1], step: 0.005, start: 1,
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
        mode: 'parameter-sweep', controlCount: 4, control: {label: 'Vrednost uteži', kind: 'number'},
        observe: boardGeometry,
        sweep: {waypoints: [2, 4, 0.5, 2], step: 0.25, start: 2,
            revealControl: page => page.getByRole('button', {name: 'Krivulja1', exact: true}).click(),
            beforeCapture: page => page.locator('#jgbox').evaluate(container => {
                const board=Object.values(window.JXG.boards).find(b=>b.containerObj===container);
                const objects=Object.values(board.objects);
                // Capture-only editing chrome: the four translucent rectangle handles, and only their edges.
                const handles=objects.filter(o=>o.elType==='point' && o.name==='' && o.visProp.opacity===0.4);
                if(handles.length!==4)throw new Error('Expected exactly four selection handles');
                const ids=new Set(handles.map(o=>o.id));
                objects.filter(o=>o.point1&&o.point2&&ids.has(o.point1.id)&&ids.has(o.point2.id)).forEach(o=>o.hide());
                handles.forEach(o=>o.hide());
                objects.filter(o=>o.elType==='point'&&!ids.has(o.id)&&o.visProp.visible!==false)
                    .forEach(o=>o.setAttribute({fillColor:'#bd8040',strokeColor:'#fffdf5'}));
            }),
            readout: {read: ({range}) => range.inputValue(), matches: (s, v) => Math.abs(Number(String(s).replace(',', '.')) - v) < 1e-9},
            observe: boardGeometry,
            check(sample, previous, first, spec) {
                const assert = spec._assert, controls = sample.controls.map(({x,y}) => ({x,y})), original = first.controls;
                assert.equal(controls.length, 4, 'Rational control polygon must remain present');
                assert.equal(sample.observed.visiblePoints.length, 4, 'Rational preview must contain only its four controls, without selection handles');
                for (let i = 0; i < controls.length; i++) assert.ok(close(controls[i], original[i], 1e-9), `Rational control ${i} moved while its weight changed`);
                checkRationalCurve({...sample, controls}, [1, sample.actual.input, 1, 1], [0,1], 'Rational Bézier weight sweep', assert);
                const p1 = controls[1], baseline = rational(controls, [1,2,1,1], 1/3), changed = rational(controls, [1,sample.actual.input,1,1], 1/3);
                if (sample.actual.input > 2) assert.ok(Math.hypot(changed.x-p1.x,changed.y-p1.y) < Math.hypot(baseline.x-p1.x,baseline.y-p1.y), 'Increasing w₁ must attract the evaluated curve point toward p₁');
                if (sample.actual.input < 2) assert.ok(Math.hypot(changed.x-p1.x,changed.y-p1.y) > Math.hypot(baseline.x-p1.x,baseline.y-p1.y), 'Decreasing w₁ must move the evaluated curve point away from p₁');
                if (Math.abs(sample.actual.input - 2) > 1e-9) assert.notEqual(sample.curvePathHash, first.curvePathHash, 'Changing the selected weight did not reshape the rational curve');
                if (sample.index === 95) assert.equal(sample.capture.sha256, first.capture.sha256, 'Rational weight sweep must return exactly to its poster state');
            }},
        invariants: ['Only w₁ changes through the selected-curve weight input; all four control points and the supporting polygon stay fixed', 'Rendered curve agrees with independent weighted Bernstein evaluation for [1,w₁,1,1]; increasing w₁ attracts it toward p₁'],
    },
    'rational-decasteljau': {
        conceptStatus: 'supported',
        mode: 'parameter-sweep', controlCount: 4, control: {label: 'Parameter t', kind:'range'},
        sweep: {waypoints:[0.5,0.7,0.3,0.5],step:0.01,start:0.5,
            readout:{read:({range})=>range.getAttribute('aria-valuetext'),matches:(s,v)=>Math.abs(Number(String(s).replace(',','.'))-v)<0.011},
            observe:boardGeometry,
            check(sample, previous, first, spec) {
                const assert=spec._assert, P=sample.controls.map(({x,y})=>({x,y})), t=sample.actual.input;
                const levels=homogeneousLevels(P,[1,2,1,1],t);
                assertVisibleConstruction(sample.observed, levels.flat(), levels.flatMap(level=>level.slice(1).map((p,i)=>[level[i],p])), 'Weighted de Casteljau', assert);
                assert.equal(sample.observed.visiblePoints.length, P.length+levels.flat().length, 'Construction must have no selection handles');
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
        invariants:['Visible weighted interpolation points and legs agree with projected homogeneous de Casteljau levels', 'Evaluated point and curve prefix agree with independent rational Bernstein evaluation; no selection handles'],
    },
    'rational-extrapolation': {
        mode:'parameter-sweep',controlCount:4,control:{label:'Parameter ekstrapolacije t',kind:'range'},
        sweep:{waypoints:[1,1.2,1],step:0.005,start:1,
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
        presentationDependencyIfMissing: 'Both child polygons and each child’s distinguishing inner weight must be visible; all eight source weight labels must agree with homogeneous subdivision. Colliding labels may be omitted under the existing selective-label policy.',
        mode:'discrete-exact-steps',controlCount:4,checkpoints:[
            {value:'setup',actions:[]},{value:'subdivided',actions:[{kind:'button',label:'Subdiviziraj'},
                {kind:'toggle',label:'Kontrolni poligon',value:true,index:1},
                ...[0,1].flatMap(index => [false,true].map(value => ({kind:'toggle',label:'Uteži',value,index})))]},{value:'setup',actions:[]},
        ],holds:[24,48,24],observe:boardGeometry,
        checkStep(sample,first,spec){
            if(sample.checkpoint==='subdivided')checkRationalSubdivision(sample,first,spec._assert);
            if(sample.checkpoint==='setup'&&sample.firstFrame===72)spec._assert.equal(sample.capture.sha256,first.capture.sha256,'Exact subdivision reset must return to the poster checkpoint');
        },
        invariants:['One supported Subdiviziraj action creates exactly two rational child curves with their own polygons and weights', 'Each child matches the independent homogeneous subdivision and the corresponding reparameterized parent interval; frames 72–95 are a fresh-route reset to the poster'],
    },
    circle: {
        mode:'discrete-exact-steps',checkpoints:[
            {value:3,actions:[]},{value:4,actions:[{kind:'button',label:'Povečaj število',count:1},
                ...Array.from({length:4},(_,index)=>({kind:'toggle',label:'Kontrolni poligon',value:true,index}))]},{value:3,actions:[]},
        ],holds:[24,60,12],observe:boardGeometry,
        checkStep(sample,first,spec){
            const assert=spec._assert,curves=sample.observed.curves.filter(c=>c.samples.length===401);
            checkCircleArcs(curves,sample.checkpoint,assert);
        },
        invariants:['Count equals the displayed arc count; arcs meet in cyclic order and lie on the radius-3 circle'],
    },
    'spline-cn': {
        mode:'discrete-exact-steps',checkpoints:[
            {value:1,actions:[]},{value:0,actions:[{kind:'button',label:'Zmanjšaj število',group:'Stopnja zveznosti',count:1},
                {kind:'toggle',label:'Kontrolni poligon',value:false},
                {kind:'toggle',label:'Kontrolni poligon',value:true}]},{value:1,actions:[]},
        ],holds:[24,60,12],observe:page=>boardGeometry(page,true),
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
            if(sample.checkpoint===0)assert.ok(sample.observed.jets.some(jet=>Math.hypot(jet.left.x-jet.right.x,jet.left.y-jet.right.y)>1), 'The C0 comparison must visibly change a join derivative, rather than only the global shape');
            if(sample.checkpoint===0){
                const P=sample.state.points.filter(p=>p.draggable);
                assert.ok(P.length>=4,'C0 free polygon must remain visible');
                assert.ok(hasVisibleSegment(sample.observed.visibleSegments,P[1],P[2])&&hasVisibleSegment(sample.observed.visibleSegments,P[2],P[3]),'Both control legs at the representative C0 join must be visible');
            }
        },
        invariants:['The degree-2 spline preserves shared joins; C1 order is present at the selected continuity order'],
    },
    'spline-c1': {
        presentationDependencyIfMissing: 'Visible midpoint joins on P1–P2, P2–P3 and P3–P4 and the central polygon legs are required; the final P4–P5 span ends at the free endpoint, without an extra midpoint join.',
        mode:'pointer-drag',controlCount:6,
        start:ctx=>ctx.points[3],path:(p,d)=>({x:p.x+0.5*d,y:p.y-0.45*d}),
        restore:restoreControlPoint(3),
        observe:page=>boardGeometry(page,true),
        check(sample,previous,first,spec){
            assertDraggedPoint(sample,first,3,'C1 spline central free-point drag',spec._assert);
            const assert=spec._assert,curve=sample.observed.curves[0];
            assert.ok(curve,'C1 spline curve missing');
            for(const j of [1,2,3]){const jet=sample.observed.jets.find(v=>Math.abs(v.t-j/4)<1e-12);assert.ok(jet,`C1 join ${j} missing`);assert.ok(close(jet.leftLimit,jet.rightLimit,1e-5),`C1 positional relation fails at join ${j}`);assert.ok(Math.hypot(jet.left.x-jet.right.x,jet.left.y-jet.right.y)<0.03,`C1 first-derivative relation fails at join ${j}`);}
            if(sample.index===47){
                const P=sample.points.filter(p=>p.draggable).map(({x,y})=>({x,y}));
                const joins=P.slice(1,-2).map((p,i)=>({x:(p.x+P[i+2].x)/2,y:(p.y+P[i+2].y)/2}));
                assertVisibleConstruction(sample.observed,joins,[[P[2],joins[1]],[joins[1],P[3]],[P[3],joins[2]],[joins[2],P[4]]],'C1 midpoint construction',assert);
            }
        },
        invariants:['Moving a free point adjacent to the central join changes the surrounding spline while every join retains positional and first-derivative continuity under the native uniform knot parameter'],
    },
    'spline-c2': {
        presentationDependencyIfMissing: 'Visible central C2 computed inner points, join point and the two adjacent free-polygon legs are required; capture checks fail if the current graph presentation omits them.',
        mode:'pointer-drag',controlCount:7,crf:14,
        encoderBudget:'Central join capture: CRF 10 produced 345903 B; CRF 14 produces 271168 B under the unchanged 300 KiB budget',
        start:ctx=>ctx.points[3],path:(p,d)=>({x:p.x+0.5*d,y:p.y+0.4*d}),restore:restoreControlPoint(3),observe:page=>boardGeometry(page,true),
        check(sample,previous,first,spec){
            assertDraggedPoint(sample,first,3,'C2 spline central free-point drag',spec._assert);
            const assert=spec._assert,curve=sample.observed.curves[0];assert.ok(curve,'C2 spline curve missing');
            for(const j of [1,2,3]){const jet=sample.observed.jets.find(v=>Math.abs(v.t-j/4)<1e-12);assert.ok(jet,`C2 join ${j} missing`);assert.ok(close(jet.leftLimit,jet.rightLimit,1e-5),`C2 positional relation fails at join ${j}`);assert.ok(Math.hypot(jet.left.x-jet.right.x,jet.left.y-jet.right.y)<0.03,`C2 first derivatives fail at join ${j}`);assert.ok(Math.hypot(jet.left2.x-jet.right2.x,jet.left2.y-jet.right2.y)<0.5,`C2 second derivatives fail at join ${j}`);}
            if(sample.index===47){
                const P=sample.points.filter(p=>p.draggable).map(({x,y})=>({x,y}));
                const left={x:(2*P[2].x+P[3].x)/3,y:(2*P[2].y+P[3].y)/3};
                const leftInner={x:(P[2].x+2*P[3].x)/3,y:(P[2].y+2*P[3].y)/3};
                const rightInner={x:(2*P[3].x+P[4].x)/3,y:(2*P[3].y+P[4].y)/3};
                const right={x:(P[3].x+2*P[4].x)/3,y:(P[3].y+2*P[4].y)/3};
                const join={x:(leftInner.x+rightInner.x)/2,y:(leftInner.y+rightInner.y)/2};
                assertVisibleConstruction(sample.observed,[left,leftInner,join,rightInner,right],[[P[2],P[3]],[P[3],P[4]]],'C2 central computed construction',assert);
                assertBothSpansChanged(first.observed.curves[0].samples,curve.samples,assert);
            }
        },
        invariants:['Moving a free point adjacent to the central join changes both neighboring spans while every join retains position, first and second derivative constraints under the native uniform knot parameter'],
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
        mode:'discrete-exact-steps',checkpoints:[
            {value:'weighted',actions:[]},{value:'uniform',actions:[{kind:'select',label:'Izberi parametrizacijo',value:'uniform'}]},
            {value:'weighted',actions:[{kind:'select',label:'Izberi parametrizacijo',value:'alpha'}]},
        ],holds:[24,60,12],observe:boardGeometry,
        checkStep(sample,first,spec){
            const assert=spec._assert,curve=sample.observed.curves.find(c=>c.samples.length===401),markers=sample.observed.markers;
            assert.ok(curve,'PH curve samples missing');assert.equal(markers.length,10,'Both exact comparison states must keep ten interior markers');
            const reference=first.observed.curves.find(c=>c.samples.length===401);
            assert.equal(curve.samples.length,reference.samples.length);
            curve.samples.forEach((p,i)=>assert.ok(close(p,reference.samples[i],1e-9),'Changing sampling mode must preserve every evaluated point of the PH curve'));
            const arc=[];let length=0;
            for(let i=1;i<curve.samples.length;i++){length+=Math.hypot(curve.samples[i].x-curve.samples[i-1].x,curve.samples[i].y-curve.samples[i-1].y);arc.push(length);}
            const fractions=markers.map(m=>{let best=Infinity,pos=0;for(let i=0;i<curve.samples.length-1;i++){const a=curve.samples[i],b=curve.samples[i+1],dx=b.x-a.x,dy=b.y-a.y,seg=dx*dx+dy*dy,s=seg?Math.max(0,Math.min(1,((m.x-a.x)*dx+(m.y-a.y)*dy)/seg)):0,q={x:a.x+s*dx,y:a.y+s*dy},dist=Math.hypot(m.x-q.x,m.y-q.y);if(dist<best){best=dist;pos=(arc[i-1]||0)+s*Math.sqrt(seg);}}assert.ok(best<0.02,'Sample marker leaves the independently sampled PH curve');return pos/length;});
            const equal=fractions.map((fraction,i)=>Math.abs(fraction-(i+1)/(markers.length+1)));
            if(sample.checkpoint==='uniform')for(let i=0;i<equal.length;i++)assert.ok(equal[i]<0.002,`Uniform marker ${i} is not at its equal-arc-length fraction including endpoint gaps`);
            else assert.ok(Math.max(...equal)>0.002,'Weighted parameterization unexpectedly has equal arc-length spacing; comparison is not legible');
        },
        invariants:['The same ten markers stay on a fixed PH curve in both exact states; weighted mode has unequal spatial gaps and uniform mode has equal arc-length fractions including endpoint gaps'],
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
            if (!spec.conceptStatus) spec.checkpoints = spec.checkpoints.map((checkpoint, index) => ({...checkpoint,
                phase:index===0?'setup':index===spec.checkpoints.length-1?'reset':'discovery'}));
            spec.schedule = {kind:'discrete-exact-steps',checkpoints:spec.checkpoints.map(c=>c.value),holds:spec.holds,
                ...(!spec.conceptStatus ? {resetFrame:spec.holds.slice(0,-1).reduce((a,b)=>a+b,0)} : {}),
                input:'fresh route per exact checkpoint, reached by the declared supported controls'};
        } else {
            spec.schedule = {kind:'sin2-out-and-back',phase:'clamp((frame-12)/71)',displacement:'sin²(π·phase)',
                zeroDisplacementFrames:'0-12 and 83-95',movingFrames:'13-82',press:13,release:83,
                waypoints:'start → supported pointer path → exact original coordinate',grid:'pointer coordinates mapped through fixed board camera',restore:'supported pointer drag restores and verifies the original indexed x/y values'};
        }
        if (spec.control?.kind === 'number' && spec.schedule?.kind === 'piecewise-sin2') spec.schedule.input = `supported number input ${spec.control.label}`;
        spec.encoderBudget ||= 'CRF 10 default; final diagnostic encode must remain under 300 KiB; lower CRF quality only if the measured file exceeds the limit';
    }
    return cloned;
}

module.exports = {createCurveMotionSpecs, IDS, bernstein, rational, homogeneousLevels, rationalSubdivision, checkRationalSubdivision, c2Spline, checkBernsteinFamily, checkCircleArcs, hasVisiblePoint, hasVisibleSegment, assertVisibleConstruction, assertBothSpansChanged};
