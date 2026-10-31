// Standalone grid drawing benchmark page. Query: ?variant=lines|poly&ellipse=0|1. No app route.
import {JSXGraph} from 'jsxgraph';
import '../../node_modules/jsxgraph/distrib/jsxgraph.css';
import {gridImage} from '../../src/linear/gridImage';
import {apply, unitSquareImage, type Mat2, type Vec2} from '../../src/linear/matrix2';

const params = new URLSearchParams(location.search);
const variant = params.get('variant') === 'poly' ? 'poly' : 'lines';
const withEllipse = params.get('ellipse') === '1';
const HALF = 6;
const board: any = JSXGraph.initBoard('box', {
    boundingbox: [-8, 6, 8, -6], axis: true, grid: true, showCopyright: false, showNavigation: false,
    pan: {enabled: false}, zoom: {wheel: false},
});

const h1: any = board.create('point', [1.5, 0.5], {name: 'e1', size: 5, color: '#c00'});
const h2: any = board.create('point', [-0.5, 1.25], {name: 'e2', size: 5, color: '#00c'});
const matrix = (): Mat2 => [[h1.X(), h2.X()], [h1.Y(), h2.Y()]];

// Grid image is computed once per board update, however many elements read it.
let version = 0;
let stamp = -1;
let cache = gridImage(matrix(), HALF, 1);
let gridCalls = 0;
const lines = () => {
    if (stamp !== version) { stamp = version; cache = gridImage(matrix(), HALF, 1); gridCalls++; }
    return cache;
};

const style = {strokeColor: '#2a7', strokeWidth: 1, highlight: false, fixed: true, withLabel: false};
if (variant === 'lines') {
    for (let i = 0; i < 26; i++) {
        board.create('segment', [
            [() => lines()[i].from[0], () => lines()[i].from[1]],
            [() => lines()[i].to[0], () => lines()[i].to[1]],
        ], {...style, point1: {visible: false}, point2: {visible: false}});
    }
} else {
    const poly: any = board.create('curve', [[], []], style);
    poly.updateDataArray = function () {
        const x: number[] = [], y: number[] = [];
        for (const l of lines()) { x.push(l.from[0], l.to[0], NaN); y.push(l.from[1], l.to[1], NaN); }
        this.dataX = x; this.dataY = y;
    };
}

// Unit square image.
const squareCorner = (k: number, c: 0 | 1) => () => unitSquareImage(matrix())[k][c];
board.create('polygon', [0, 1, 2, 3].map(k => [squareCorner(k, 0), squareCorner(k, 1)]),
    {vertices: {visible: false}, borders: {strokeColor: '#e80', strokeWidth: 2, fixed: true}, fillOpacity: 0.1, fixed: true});

// Bezier fixture and its image (an affine image of a Bezier curve is the Bezier curve of the images).
const ctrl: Vec2[] = [[-5, -3], [-3, 4], [0, -4], [3, 3]];
const deCasteljau = (pts: readonly Vec2[], t: number): Vec2 => {
    let p = pts.slice();
    while (p.length > 1) { const q = p; p = q.slice(1).map((b, i) => [(1 - t) * q[i][0] + t * b[0], (1 - t) * q[i][1] + t * b[1]] as Vec2); }
    return p[0];
};
board.create('curve', [(t: number) => deCasteljau(ctrl, t)[0], (t: number) => deCasteljau(ctrl, t)[1], 0, 1], {strokeColor: '#888', fixed: true});
let bz: Vec2[] = ctrl.map(p => apply(matrix(), p)), bzStamp = -1;
const bzImage = () => { if (bzStamp !== version) { bzStamp = version; bz = ctrl.map(p => apply(matrix(), p)); } return bz; };
board.create('curve', [(t: number) => deCasteljau(bzImage(), t)[0], (t: number) => deCasteljau(bzImage(), t)[1], 0, 1], {strokeColor: '#a0a', strokeWidth: 2, fixed: true});

// Optional ~100-point ellipse: image of the unit circle.
if (withEllipse) {
    const ell: any = board.create('curve', [[], []], {strokeColor: '#06c', strokeWidth: 2, fixed: true});
    ell.updateDataArray = function () {
        const m = matrix(), x: number[] = [], y: number[] = [];
        for (let i = 0; i <= 100; i++) { const a = (2 * Math.PI * i) / 100; const p = apply(m, [Math.cos(a), Math.sin(a)]); x.push(p[0]); y.push(p[1]); }
        this.dataX = x; this.dataY = y;
    };
}

// Instrumentation: wrap board.update; record rAF intervals while recording.
const stats = {updates: 0, updateMs: [] as number[], frames: [] as number[], recording: false};
const originalUpdate = board.update.bind(board);
board.update = function (...args: unknown[]) {
    version++;
    const t0 = performance.now();
    const r = originalUpdate(...args);
    if (stats.recording) { stats.updates++; stats.updateMs.push(performance.now() - t0); }
    return r;
};
let last = performance.now();
const tick = (now: number) => { if (stats.recording) stats.frames.push(now - last); last = now; requestAnimationFrame(tick); };
requestAnimationFrame(tick);

/** Non-finite coordinates among handles, grid-image endpoints and every point JSXGraph holds for curves. NaN separators in poly mode live in dataX/dataY only. */
function nonFiniteCount(): {nonFinite: number; checked: number; nanBreakSeparators: number; sample: unknown; svgNodes: number} {
    let nonFinite = 0, checked = 0, nanBreakSeparators = 0;
    const check = (v: number) => { checked++; if (!Number.isFinite(v)) nonFinite++; };
    for (const el of board.objectsList as any[]) {
        if (el.elType === 'curve') {
            for (const v of el.dataX ?? []) { if (Number.isNaN(v)) nanBreakSeparators++; else check(v); }
            for (const v of el.dataY ?? []) { if (!Number.isNaN(v)) check(v); }
            for (const c of el.points ?? []) { if (c.usrCoords[0] !== 0 && Number.isFinite(c.usrCoords[1]) === false && !Number.isNaN(c.usrCoords[1])) nonFinite++; }
        } else if (el.elType === 'point') { check(el.X()); check(el.Y()); }
        else if (el.elType === 'line') for (const p of [el.point1, el.point2]) { check(p.X()); check(p.Y()); }
    }
    for (const l of lines()) for (const p of [l.from, l.to]) { check(p[0]); check(p[1]); }
    // Screen coordinates actually handed to the SVG renderer for the grid image segments/path.
    const svg = Array.from(document.querySelectorAll('#box svg path, #box svg line')).map(n => n.getAttribute('d') ?? `${n.getAttribute('x1')} ${n.getAttribute('y1')} ${n.getAttribute('x2')} ${n.getAttribute('y2')}`);
    const bad = svg.filter(s => /NaN|Infinity|undefined|null/.test(s)).length;
    return {nonFinite: nonFinite + bad, checked: checked + svg.length, nanBreakSeparators, sample: [lines()[13].from, lines()[13].to], svgNodes: svg.length};
}

(window as any).bench = {
    variant, withEllipse, elementCount: board.objectsList.length, stats, nonFiniteCount,
    gridCalls: () => gridCalls,
    handlePixel: (i: 1 | 2) => { const p = i === 1 ? h1 : h2; return [p.coords.scrCoords[1], p.coords.scrCoords[2]]; },
    box: () => { const r = document.getElementById('box')!.getBoundingClientRect(); return {x: r.x, y: r.y}; },
    // Place a handle by API (an exact, possibly singular matrix); a drag cannot hit exact positions.
    setHandle: (i: 1 | 2, x: number, y: number) => { (i === 1 ? h1 : h2).setPosition(1 /* COORDS_BY_USER */, [x, y]); board.update(); },
    reset: () => { stats.updates = 0; stats.updateMs = []; stats.frames = []; gridCalls = 0; },
    ready: true,
};
