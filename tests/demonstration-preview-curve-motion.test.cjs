const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createCurveMotionSpecs, IDS, bernstein, rational, homogeneousLevels, c2Spline, checkBernsteinFamily, checkCircleArcs} = require('../scripts/demonstration-preview-curve-motion.cjs');

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
