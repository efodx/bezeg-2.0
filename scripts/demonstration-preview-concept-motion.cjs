'use strict';

const nodeAssert = require('node:assert/strict');

const close = (a, b, tolerance = 1e-7) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
const parseNumber = value => Number(String(value).trim().replace(/[−–]/g, '-').replace(',', '.'));
const inputNumber = (sample, label) => {
    const item = sample.observed.inputValues.find(value => value.label === label);
    return item ? parseNumber(item.value) : Number.NaN;
};

/** Read only rendered board objects and accessible, labeled controls/readouts. */
function observeBoard(page) {
    return page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG.boards).find(item => item.container === container.id || item.containerObj === container);
        const visible = Object.values(board.objects).filter(item => item.visProp?.visible !== false && item.rendNode
            && getComputedStyle(item.rendNode).display !== 'none' && getComputedStyle(item.rendNode).visibility !== 'hidden');
        const finite = value => Number.isFinite(value) ? value : null;
        const curves = visible.filter(item => item.elType === 'curve').map(curve => {
            const min = typeof curve.minX === 'function' ? curve.minX() : 0;
            const max = typeof curve.maxX === 'function' ? curve.maxX() : 1;
            return {samples: Array.from({length: 65}, (_, i) => {
                const x = min + (max - min) * i / 64;
                return {x: finite(x), y: finite(curve.Y(x))};
            })};
        });
        const points = visible.filter(item => ['point', 'glider'].includes(item.elType)).map(point => ({
            name: point.name, x: finite(point.X()), y: finite(point.Y()),
        }));
        const segments = visible.filter(item => item.elType === 'segment' && item.point1 && item.point2).map(item => ({
            ends: [item.point1, item.point2].map(point => ({x: finite(point.X()), y: finite(point.Y())})),
        }));
        const readouts = Object.fromEntries([...document.querySelectorAll('[data-readout]')]
            .map(item => [item.dataset.readout, item.querySelector('dd')?.textContent?.trim() ?? '']));
        const reveals = Object.fromEntries([...document.querySelectorAll('[data-revealed]')]
            .map(item => [item.dataset.action, item.getAttribute('data-revealed')]));
        const inputValues = [...document.querySelectorAll('input[role="spinbutton"],input[type="range"],select')].map(item => ({
            label: [...(item.labels || [])].map(label => label.textContent.trim()).join(' ').trim() || item.getAttribute('aria-label') || '',
            value: item.value,
        }));
        const regions = visible.filter(item => item.elType === 'curve' && Object.prototype.hasOwnProperty.call(item,'updateDataArray') && Number(item.visProp.fillopacity)>0)
            .map(item => ({dash:item.visProp.dash, points:(item.dataX || []).map((x,i) => ({x:finite(x),y:finite(item.dataY[i])})).filter(p=>p.x!==null&&p.y!==null)}));
        return {curves, points, segments, readouts, reveals, inputValues, regions};
    });
}

function functionMatches(curves, formula, lo, hi, assert, label) {
    const matches = curves.filter(curve => {
        const samples = curve.samples.filter(point => point.x !== null && point.y !== null && point.x >= lo - 1e-8 && point.x <= hi + 1e-8);
        return samples.length >= 8 && samples.every(point => close(point.y, formula(point.x), 3e-6));
    });
    assert.ok(matches.length, `${label} does not match its independent formula`);
    return matches;
}

function createConceptMotionSpecs(helpers = {}) {
    const assert = helpers.assert || nodeAssert;
    const exact = (checkpoints, holds, phases, camera, invariants) => ({
        mode: 'discrete-exact-steps', checkpoints, holds,
        schedule: {
            kind: 'discrete-exact-steps', checkpoints: checkpoints.map(({value}) => value), holds, phases,
            camera, resetBoundary: phases.find(phase => phase.kind === 'reset')?.checkpoint,
            resetFrame: holds.slice(0, -1).reduce((sum, hold) => sum + hold, 0),
        },
        invariants: [...invariants, 'Every mathematical input is a supported exact held state; no interpolation between checkpoints. First and last settled PNGs match the recipe poster.'],
        encoderBudget: 'Existing silent 720×440, 24 fps, 96-frame, 300 KiB preview contract; revised encode still requires byte-budget verification.',
        backgroundSample: {x: 40, y: 40},
    });

    const accumulationCheck = (sample, first, spec) => {
        const o = sample.observed;
        const x = o.points.find(point => point.name === '$$x$$')?.x;
        assert.ok(close(inputNumber(sample, 'Točka x'), x, 5e-5), 'The displayed x must match the full-precision board coordinate');
        const a = inputNumber(sample, 'Spodnja meja a');
        assert.ok(close(a, 0, 1e-9), 'Accumulation lower bound a must remain 0');
        assert.ok([2, Math.PI, 4].some(value => close(x, value, 1e-7)), `Unexpected exact x checkpoint ${x}`);
        functionMatches(o.curves, Math.sin, -0.5, 6.5, assert, 'Integrand f(x)=sin x');
        functionMatches(o.curves, u => 1 - Math.cos(u), -0.5, 6.5, assert, 'Accumulation A(x)=1−cos x');
        functionMatches(o.curves, u => (1 - Math.cos(x)) + Math.sin(x) * (u - x), -0.5, 6.5, assert, 'Tangent to A at x');
        const point = name => o.points.find(item => item.name === name);
        const A = point('$$A(x)$$'), f = point('$$f(x)$$');
        assert.ok(A && close(A.x, x, 1e-8) && close(A.y, 1 - Math.cos(x), 2e-7), 'A(x) marker must equal (x,1−cos x)');
        assert.ok(f && close(f.x, x, 1e-8) && close(f.y, Math.sin(x), 2e-7), 'Integrand marker must equal (x,sin x)');
        assert.ok(o.reveals['toggle-accumulation'] === 'true', 'A curve and tangent must be revealed for the signed-area story');
        const signed = parseNumber(o.readouts['signed-integral']);
        const slope = parseNumber(o.readouts.slope);
        assert.ok(close(signed, 1 - Math.cos(x), 6e-5), 'Signed integral must equal the independently evaluated antiderivative');
        assert.ok(close(slope, Math.sin(x), 6e-5), 'A tangent slope must equal f(x)');
        if (sample.phase === 'zero-integrand') {
            assert.ok(close(x, Math.PI, 1e-7) && Math.abs(Math.sin(x)) < 1e-7, 'The zero hold must occur at the actual integrand zero π');
            assert.ok(close(A.y, 2, 2e-7) && close(slope, 0, 1e-7), 'At π, A=2 and the tangent is horizontal');
        }
        if (sample.phase === 'negative-contribution') {
            assert.ok(x > Math.PI && Math.sin(x) < 0, 'The last area stretch must lie below the axis');
            const below = parseNumber(o.readouts['below-axis']);
            assert.ok(Number.isFinite(below) && below < 0, 'Below-axis signed contribution must be negative');
            assert.ok(close(signed, 2 + below, 8e-5), 'Positive and negative signed contributions must add to A(x)');
            assert.ok(close(parseNumber(o.readouts['above-axis']), 2, 6e-5), 'Positive contribution must remain the integral over [0,π]');
        }
        for (const [negative,lo,hi,area] of [[false,0,Math.min(x,Math.PI),1-Math.cos(Math.min(x,Math.PI))],
            [true,Math.PI,x, x>Math.PI?1+Math.cos(x):0]]) {
            if (area<1e-12) continue;
            const region = o.regions.find(r => r.points.length>3 && r.points.some(p => negative ? p.y < -1e-5 : p.y > 1e-5));
            assert.ok(region, 'Signed filled region must be visible');
            assert.equal(region.dash,negative?2:0,'Negative fill must also be distinguished by dashed edges');
            const pts=region.points;
            assert.ok(close(Math.min(...pts.map(p=>p.x)),lo,1e-7)&&close(Math.max(...pts.map(p=>p.x)),hi,1e-7),'Fill interval must match its signed stretch');
            for (const p of pts) assert.ok(p.x>=lo-1e-7&&p.x<=hi+1e-7&&Math.abs(p.y-Math.sin(p.x))<1e-7||Math.abs(p.y)<1e-9,'Filled boundary must follow sin x and the axis');
            const polygonArea=Math.abs(pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
            assert.ok(close(polygonArea,area,.005),'Filled polygon area must approximate its independent signed integral');
        }
        if (sample.phase === 'reset') assert.ok(close(x, 2, 1e-9), 'Accumulation reset must return to poster x=2');
        assert.ok(first.observed && spec.schedule.resetFrame === 84, 'Exact accumulation reset boundary must be frame 84');
    };

    const convexityCheck = (sample, first) => {
        const t = inputNumber(sample, 'Točka dotika tangente t'), o = sample.observed;
        assert.ok([-0.5, 0.5, 1].some(value => close(t, value, 1e-8)), `Unexpected convexity checkpoint t=${t}`);
        const lo = -1, hi = 1.5, chord = x => 0.5 * x + 1.5, tangent = x => 2 * t * x - t * t;
        functionMatches(o.curves, x => x * x, lo, hi, assert, 'Convex function f(x)=x²');
        functionMatches(o.curves, tangent, lo, hi, assert, 'Tangent at t');
        const chordLine = o.segments.find(segment => segment.ends.length === 2 && segment.ends.every(p => p.x !== null && p.y !== null)
            && segment.ends.every(p => close(p.y, chord(p.x), 2e-7))
            && segment.ends.some(p => close(p.x, lo, 1e-8)) && segment.ends.some(p => close(p.x, hi, 1e-8)));
        assert.ok(chordLine, 'The fixed endpoint chord over [−1,1.5] must remain visible');
        for (let i = 0; i <= 20; i++) {
            const x = lo + (hi - lo) * i / 20;
            assert.ok(x * x <= chord(x) + 1e-9, `Curve lies above its chord at x=${x}`);
            assert.ok(x * x >= tangent(x) - 1e-9, `Curve lies below its tangent at x=${x}`);
        }
        assert.ok(o.points.some(p => close(p.x, t, 1e-8) && close(p.y, t * t, 2e-7)), 'Tangent point (t,t²) must remain on the graph');
        const shown = sample.phase === 'second-derivative-reveal';
        assert.equal(o.reveals['toggle-second-derivative'], shown ? 'true' : 'false', 'Second-derivative conclusion must arrive only after the geometric comparison');
        if (shown) {
            assert.match(o.readouts['second-derivative-sign'], /(?:f″|f'')\s*(?:≥|>=)\s*0/i, 'Reveal must state f″ ≥ 0 on the interval');
            assert.match(o.readouts.verdict, /^konveksna na \[a, b\]:/, 'Payoff must identify convexity on the fixed interval');
            assert.equal(o.readouts['tangent-verdict'], 'graf leži na tangenti ali nad njo', 'Convex graph must lie above its tangent');
            assert.ok(sample.presentation.selectedConclusions.some(c => c.withinFrame && c.clipPath === 'none'), 'Second-derivative conclusion must be visible inside the fixed camera');
        } else assert.ok(/skrito|hidden/i.test(o.readouts.verdict), 'The derivative conclusion must remain hidden before the reveal');
        assert.ok(first.observed, 'Convexity poster state must be observed for reset comparison');
    };

    const accumulationCheckpoints = [
        {value: 2, phase: 'setup', actions: [{kind: 'number', label: 'Točka x', value: 2}]},
        {value: Math.PI, phase: 'zero-integrand', actions: [{kind: 'number', label: 'Točka x', value: Math.PI, displayDecimals: 4}]},
        {value: 4, phase: 'negative-contribution', actions: [{kind: 'number', label: 'Točka x', value: 4}]},
        {value: 2, phase: 'reset', actions: [{kind: 'number', label: 'Točka x', value: 2}]},
    ];
    const accumulationPhases = [
        {name: 'setup', checkpoint: 2, frames: 18}, {name: 'integrand zero and maximum A', checkpoint: Math.PI, frames: 24},
        {name: 'negative signed area reduces A', checkpoint: 4, frames: 42}, {name: 'reset', kind: 'reset', checkpoint: 2, frames: 12},
    ];
    const convexityCheckpoints = [
        {value: 0.5, phase: 'setup', actions: [{kind: 'number', label: 'Točka dotika tangente t', value: 0.5}]},
        {value: -0.5, phase: 'tangent-comparison', actions: [{kind: 'number', label: 'Točka dotika tangente t', value: -0.5}]},
        {value: 1, phase: 'tangent-comparison', actions: [{kind: 'number', label: 'Točka dotika tangente t', value: 1}]},
        {value: 0.5, phase: 'second-derivative-reveal', actions: [
            {kind: 'number', label: 'Točka dotika tangente t', value: 0.5}, {kind: 'button', label: 'Pokaži drugi odvod'},
        ]},
        {value: 0.5, phase: 'reset', actions: [{kind: 'number', label: 'Točka dotika tangente t', value: 0.5}]},
    ];
    const convexityPhases = [
        {name: 'geometric setup', checkpoint: 0.5, frames: 18}, {name: 'tangent moves', checkpoint: -0.5, frames: 14},
        {name: 'tangent moves', checkpoint: 1, frames: 14}, {name: 'second derivative reveal', checkpoint: 0.5, frames: 38},
        {name: 'reset', kind: 'reset', checkpoint: 0.5, frames: 12},
    ];

    return {
        accumulation: {
            ...exact(accumulationCheckpoints, [18, 24, 42, 12], accumulationPhases,
                'recipe coordinate window [-0.5, 2.6, 6.5, -1.4]', [
                    'For f(x)=sin x, a=0, A(x)=1−cos x and A′(x)=f(x); hold x=π where f=0, A=2 and the tangent is horizontal.',
                    'Moving to x=4 adds the signed below-axis integral −1−cos(4) to A(π)=2; positive and negative contributions reconcile with A(4).',
                    'The function, A curve, tangent, signed fills, points and lower bound a=0 retain their fixed meanings; the clip restarts at x=2 at frame 84.',
                ]),
            controlCount: 0, observe: observeBoard, checkStep: accumulationCheck,
        },
        convexity: {
            ...exact(convexityCheckpoints, [18, 14, 14, 38, 12], convexityPhases,
                'recipe coordinate window [-1.4, 3, 1.9, -1]', [
                    'For f(x)=x² on fixed [−1,1.5], the endpoint chord y=0.5x+1.5 lies above the graph and every tangent y=2tx−t² lies below it for t in the interval.',
                    'The geometric chord/curve/tangent comparisons precede the f″=2>0 reveal; the interval and curve stay fixed while t changes.',
                    'The reveal occurs only at the payoff; final reset returns to hidden second-derivative state and poster t=0.5 at frame 84.',
                ]),
            controlCount: 0, observe: observeBoard, checkStep: convexityCheck,
        },
    };
}

module.exports = {createConceptMotionSpecs, conceptMotionIds: ['accumulation', 'convexity']};
