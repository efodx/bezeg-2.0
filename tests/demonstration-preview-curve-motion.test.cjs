const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createCurveMotionSpecs, IDS, bernstein, rational, homogeneousLevels, rationalSubdivision, checkRationalSubdivision, c2Spline, checkBernsteinFamily, checkCircleArcs, assertVisibleConstruction, assertBothSpansChanged} = require('../scripts/demonstration-preview-curve-motion.cjs');

test('curve motion factory returns the assigned 13 recipes with seamless start states and math checks', () => {
    const specs = createCurveMotionSpecs({assert});
    assert.deepEqual(Object.keys(specs), IDS);
    for (const [id, spec] of Object.entries(specs)) {
        assert.ok(spec.check || spec.checkStep || spec.sweep?.check, `${id} is missing a board invariant`);
        if (spec.mode === 'parameter-sweep') {
            assert.equal(spec.sweep.waypoints[0], spec.sweep.start, `${id} must start at the poster input`);
            assert.equal(spec.sweep.waypoints.at(-1), spec.sweep.start, `${id} must return to the poster input`);
        }
        if (spec.mode === 'discrete-exact-steps') {
            assert.equal(spec.checkpoints[0].value, spec.checkpoints.at(-1).value, `${id} must return to its poster checkpoint`);
            assert.equal(spec.holds.reduce((sum, value) => sum + value, 0), 96, `${id} needs 96 frames`);
        }
    }
});

test('concept-led curve recipes expose their supported primary choreography and named dependencies', () => {
    const specs = createCurveMotionSpecs({assert});
    assert.equal(specs.rational.mode, 'parameter-sweep');
    assert.deepEqual(specs.rational.sweep.waypoints, [2, 4, 0.5, 2]);
    assert.equal(specs.rational.control.kind, 'number');
    assert.match(specs.rational.invariants.join(' '), /control points.*polygon stay fixed/i);
    assert.equal(specs.bernstein.conceptStatus, 'blocked');
    assert.match(specs.bernstein.dependency, /shared probe/i);
    assert.equal(specs['rational-decasteljau'].conceptStatus, 'blocked');
    assert.match(specs['rational-decasteljau'].dependency, /weighted interpolation levels/i);
    assert.deepEqual(specs['rational-subdivision'].checkpoints.map(row => row.value), ['setup', 'subdivided', 'setup']);
    assert.deepEqual(specs['rational-subdivision'].holds, [24, 48, 24]);
    assert.match(specs['rational-subdivision'].presentationDependencyIfMissing, /Both child polygons.*eight source weight labels/i);
    assert.deepEqual(specs['uniform-parameterization'].checkpoints.map(row => row.value), ['weighted', 'uniform', 'weighted']);
    assert.deepEqual(specs['uniform-parameterization'].holds, [24, 60, 12]);
    assert.equal(specs['spline-c1'].start({points:[0,1,2,3,4,5]}), 3);
    assert.equal(specs['spline-c2'].start({points:[0,1,2,3,4,5,6]}), 3);
    assert.match(specs['spline-c1'].presentationDependencyIfMissing, /midpoint joins/i);
    assert.match(specs['spline-c2'].presentationDependencyIfMissing, /computed inner points/i);
});

test('homogeneous subdivision yields two exact rational child representations', () => {
    const controls = [{x:-4,y:-3},{x:-3,y:3},{x:3,y:3},{x:4,y:-3}], weights = [1,2,1,1], t = 0.5;
    const [left,right] = rationalSubdivision(controls, weights, t);
    assert.equal(left.controls.length, 4);assert.equal(right.controls.length, 4);
    for (let i = 0; i <= 20; i++) {
        const s = i/20, parentLeft = rational(controls, weights, t*s), parentRight = rational(controls, weights, t+(1-t)*s);
        const childLeft = rational(left.controls,left.weights,s), childRight = rational(right.controls,right.weights,s);
        assert.ok(Math.hypot(parentLeft.x-childLeft.x,parentLeft.y-childLeft.y)<1e-10);
        assert.ok(Math.hypot(parentRight.x-childRight.x,parentRight.y-childRight.y)<1e-10);
    }
});

test('rational subdivision board check requires visible child controls, polygons and weight labels', () => {
    const controls = [{x:-4,y:-3},{x:-3,y:3},{x:3,y:3},{x:4,y:-3}], weights=[1,2,1,1], children=rationalSubdivision(controls,weights,0.5);
    const visiblePoints=children.flatMap(child=>child.controls);
    const visibleSegments=children.flatMap(child=>child.controls.slice(1).map((point,i)=>({a:child.controls[i],b:point})));
    const weightLabels=children.flatMap(child=>child.weights.map((weight,i)=>`w${i}=${weight.toFixed(2)}`));
    const curves=children.map(child=>({min:0,max:1,samples:Array.from({length:401},(_,i)=>rational(child.controls,child.weights,i/400))}));
    const sample={points:[],observed:{curves,visiblePoints,visibleSegments,weightLabels}};
    checkRationalSubdivision(sample,{points:controls.map((point,i)=>({...point,id:`p${i}`,draggable:true}))},assert);
    assert.throws(()=>checkRationalSubdivision({...sample,observed:{...sample.observed,visibleSegments:visibleSegments.slice(1)}},{points:controls.map((point,i)=>({...point,id:`p${i}`,draggable:true}))},assert),/supporting polygon edge/);
    assert.throws(()=>checkRationalSubdivision({...sample,observed:{...sample.observed,weightLabels:weightLabels.slice(1)}},{points:controls.map((point,i)=>({...point,id:`p${i}`,draggable:true}))},assert),/weight w/);
});

test('construction and C2 coupled-span checks reject missing visible evidence', () => {
    const a={x:0,y:0},b={x:1,y:1},mid={x:0.5,y:0.5};
    assertVisibleConstruction({visiblePoints:[mid],visibleSegments:[{a,b}]},[mid],[[a,b]],'fixture',assert);
    assert.throws(()=>assertVisibleConstruction({visiblePoints:[],visibleSegments:[]},[mid],[[a,b]],'fixture',assert),/construction point/);
    const before=Array.from({length:401},()=>({x:0,y:0})),after=before.map(point=>({...point}));
    for(let i=100;i<=200;i++)after[i].y=1;
    for(let i=201;i<=300;i++)after[i].y=1;
    assertBothSpansChanged(before,after,assert);
    after.fill({x:0,y:0},200,301);
    assert.throws(()=>assertBothSpansChanged(before,after,assert),/right adjacent span/);
});

test('rational de Casteljau projection agrees with independent weighted Bernstein evaluation', () => {
    const controls = [{x:-4,y:-3},{x:-3,y:3},{x:3,y:3},{x:4,y:-3}], weights = [1,2,1,1];
    for (const t of [0, 0.3, 0.5, 0.7, 1, 1.2, 1.5]) {
        const expected = rational(controls, weights, t);
        const levels = homogeneousLevels(controls, weights, t);
        const final = levels.at(-1).at(-1);
        assert.ok(Number.isFinite(expected.denominator) && Math.abs(expected.denominator) > 1e-8);
        assert.ok(Math.hypot(final.x - expected.x, final.y - expected.y) < 1e-10);
    }
});

test('polynomial Bernstein reference preserves endpoints and polynomial extrapolation', () => {
    const controls = [{x:-4,y:-2},{x:-3,y:3},{x:2,y:3},{x:3,y:-1}];
    assert.deepEqual(bernstein(controls, 0), controls[0]);
    assert.deepEqual(bernstein(controls, 1), controls.at(-1));
    assert.notDeepEqual(bernstein(controls, 1.5), controls.at(-1));
});

test('Bernstein board check validates each basis over the full domain and rejects a constant partition', () => {
    const xs=Array.from({length:401},(_,i)=>i/400),n=3;
    const family=Array.from({length:n+1},(_,k)=>({samples:xs.map(x=>({x,y:(n===0?1:([1,3,3,1][k]*x**k*(1-x)**(n-k)))}))}));
    checkBernsteinFamily({checkpoint:n,observed:{curves:family}},assert);
    const constant={checkpoint:n,observed:{curves:Array.from({length:n+1},()=>({samples:xs.map(x=>({x,y:0.25}))}))}};
    assert.throws(()=>checkBernsteinFamily(constant,assert),/independent B_/);
});

test('circle board check rejects constant radius points without angular advance', () => {
    const arcs=Array.from({length:3},(_,piece)=>({samples:Array.from({length:401},(_,i)=>{const a=2*Math.PI*(piece+i/400)/3;return{x:3*Math.cos(a),y:3*Math.sin(a)};})}));
    checkCircleArcs(arcs,3,assert);
    const stationary=Array.from({length:3},()=>({samples:Array.from({length:401},()=>({x:3,y:0}))}));
    assert.throws(()=>checkCircleArcs(stationary,3,assert),/Adjacent circular arcs|angular extent|equal arc|full turn/);
});

test('independent C2 spline reference keeps endpoints and responds to chord-knot alpha', () => {
    const points=[[-3.2,0],[-4.2,-1],[-1.7,-1],[1.3,1.8],[3.5,1.9],[4.3,0.5],[3.8,-1],[-0.5,-4],[-3.7,-4]].map(([x,y])=>({x,y}));
    for(const alpha of [0,0.3,0.7,1]){
        assert.ok(Math.hypot(c2Spline(points,alpha,0).x-points[0].x,c2Spline(points,alpha,0).y-points[0].y)<1e-10);
        assert.ok(Math.hypot(c2Spline(points,alpha,1).x-points.at(-1).x,c2Spline(points,alpha,1).y-points.at(-1).y)<1e-10);
        for(const t of [0.1,0.25,0.5,0.75,0.9]){const p=c2Spline(points,alpha,t);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
    }
    const different=c2Spline(points,0.3,0.5),neutral=c2Spline(points,0.7,0.5);
    assert.ok(Math.hypot(different.x-neutral.x,different.y-neutral.y)>1e-3);
});
