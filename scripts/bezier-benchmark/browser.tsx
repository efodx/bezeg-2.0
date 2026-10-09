import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {JSXGraph} from 'jsxgraph';
// Match the app's route-first module initialization. Workspace navigation imports
// the route table, which also imports graph subclasses.
import '../../src/Routes';
import DecasteljauGraph from '../../src/graphs/curves/bezier/DecasteljauGraph';
import {RationalBezierCurve} from '../../src/bezeg/impl/curve/rational-bezier-curve';
import scenes from './scenes.json';
import {VisibilityContext} from '../../src/graphs/context/VisibilityContext';
import '../../src/index.css';
import '../../src/bootstrap-overrides.scss';
import '../../src/App.css';
import '../../node_modules/jsxgraph/distrib/jsxgraph.css';

const query = new URLSearchParams(location.search);
const sceneSelect = document.querySelector<HTMLSelectElement>('#scene')!;
const interactionSelect = document.querySelector<HTMLSelectElement>('#interaction')!;
const diagnostics = document.querySelector<HTMLInputElement>('#diagnostics')!;
const phaseTimings = document.querySelector<HTMLInputElement>('#phase-timings')!;
const regularUpdate = document.querySelector<HTMLInputElement>('#regular-update')!;
const stableVisibility = document.querySelector<HTMLInputElement>('#stable-visibility')!;
const visibleSampling = document.querySelector<HTMLInputElement>('#visible-sampling')!;
const compareButton = document.querySelector<HTMLButtonElement>('#compare-sampling')!;
const runButton = document.querySelector<HTMLButtonElement>('#run')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const status = document.querySelector<HTMLElement>('#status')!;
const output = document.querySelector<HTMLElement>('#results')!;
const root = createRoot(document.querySelector<HTMLElement>('#root')!);
// Keep the actual controls' rendering cost, but exclude independent animation,
// preset changes, and mouse/touch/keyboard edits from a deterministic run.
document.querySelector<HTMLElement>('#root')!.setAttribute('inert', '');
document.querySelector<HTMLElement>('#root')!.style.pointerEvents = 'none';
const reports: object[] = [];
let graph: BenchmarkGraph;
let running = false;
let frameId = 0;
let cancelled = false;
let restoreDiagnostics = () => {};

scenes.forEach(scene => sceneSelect.add(new Option(scene.name, scene.name)));
sceneSelect.value = query.get('scene') || scenes[1].name;
if (!sceneSelect.value) sceneSelect.value = scenes[1].name;
interactionSelect.value = query.get('interaction') || 'animation';
diagnostics.checked = query.get('diagnostics') === '1';
phaseTimings.checked = query.get('profile') === '1';
regularUpdate.checked = query.get('update') === 'regular';
stableVisibility.checked = query.get('visibility') === 'stable';
visibleSampling.checked = query.get('sampling') === 'visible';

class BenchmarkGraph extends DecasteljauGraph {
    override defaultPreset() {
        const scene = scenes.find(scene => scene.name === sceneSelect.value)!;
        const preset = super.defaultPreset()[0];
        preset[0] = scene.weights ? 'JSXRationalBezierCurve' : 'JSXBezierCurve';
        preset[1].points = scene.points;
        if (scene.weights) preset[1].weights = scene.weights;
        return [preset];
    }

    override componentWillUnmount() {
        // Harness ownership: the app currently lacks a general board-disposal path.
        JSXGraph.freeBoard(this.board);
    }

    getBoard() { return this.board; }
}

function mount() {
    root.render(<MemoryRouter><BenchmarkGraph key={sceneSelect.value} ref={instance => {
        if (instance) {
            graph = instance;
            status.textContent = 'Ready — choose a scene and interaction';
        }
    }}/></MemoryRouter>);
}

const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1];
const summary = (values: number[]) => ({median: quantile(values, 0.5), p95: quantile(values, 0.95)});

async function run() {
    if (running) return;
    const curve = graph.getFirstCurve();
    const adapter = graph.getFirstJxgCurve();
    const board = graph.getBoard();
    const interaction = interactionSelect.value;
    if (interaction === 'weight' && !(curve instanceof RationalBezierCurve)) {
        status.textContent = 'Choose a rational scene for weight edits';
        return;
    }
    running = true;
    cancelled = false;
    runButton.disabled = sceneSelect.disabled = interactionSelect.disabled = diagnostics.disabled = phaseTimings.disabled = regularUpdate.disabled = stableVisibility.disabled = visibleSampling.disabled = compareButton.disabled = true;
    const originalPoints = curve.getPoints().map(point => [point.X(), point.Y()]);
    const originalWeights = curve instanceof RationalBezierCurve ? [...curve.getWeights()] : [];
    const counts = {
        evalCalls: 0, constructionTables: 0, constructionSchemes: 0,
        pointEvaluations: 0, boardUpdates: 0,
        evalMilliseconds: 0, constructionTableMilliseconds: 0,
        constructionSchemeMilliseconds: 0, pointEvaluationMilliseconds: 0
    };
    let skippedHiddenCurveUpdates = 0;
    const originals: Array<() => void> = [];
    const phases = {elements: [] as number[], renderer: [] as number[], labelSize: [] as number[], curveSampling: [] as number[], constructionVisibility: [] as number[]};
    let currentPhases = {elements: 0, renderer: 0, labelSize: 0, curveSampling: 0, constructionVisibility: 0};
    const replace = (object: any, name: string, replacement: (...args: any[]) => any) => {
        const hadOwn = Object.prototype.hasOwnProperty.call(object, name);
        const original = object[name];
        object[name] = replacement;
        originals.push(() => { if (hadOwn) object[name] = original; else delete object[name]; });
        return original;
    };
    if (regularUpdate.checked) {
        // Diagnostic experiment only: change full-update semantics. This omits
        // full-update label sizing AND updates of objects marked non-regular.
        // Sampling settings are unchanged. Never used in the ordinary app.
        replace(board, 'fullUpdate', function (this: any) { return this.update(); });
    }
    if (stableVisibility.checked) {
        const show = adapter.showCurrentDecasteljauScheme;
        replace(adapter, 'showCurrentDecasteljauScheme', function (this: typeof adapter, visible?: boolean) {
            if (visible !== false && this.isShowingDecasteljauScheme() &&
                this.lastDecasteljauN === this.getCurve().getPoints().length) return;
            return show.call(this, visible);
        });
    }
    if (visibleSampling.checked) {
        (board as any).objectsList.forEach((element: any) => {
            if (typeof element.updateCurve !== 'function') return;
            const updateCurve = element.updateCurve;
            replace(element, 'updateCurve', function (this: any, ...args: any[]) {
                // Controlled diagnostic only. Hidden curves can have dependent
                // gliders in other scenes, so this is not a general app policy.
                const visible = this.visProp.visible;
                if (!(typeof visible === 'function' ? visible() : visible)) {
                    skippedHiddenCurveUpdates++;
                    return this;
                }
                return updateCurve.apply(this, args);
            });
        });
    }
    if (phaseTimings.checked) {
        const timeMethod = (object: any, name: string, phase: keyof typeof phases) => {
            const original = object[name];
            if (typeof original !== 'function') return;
            replace(object, name, function (this: any, ...args: any[]) {
                const start = performance.now();
                try { return original.apply(this, args); }
                finally { currentPhases[phase] += performance.now() - start; }
            });
        };
        timeMethod(board, 'updateElements', 'elements');
        timeMethod(board, 'updateRenderer', 'renderer');
        timeMethod(adapter, 'showCurrentDecasteljauScheme', 'constructionVisibility');
        (board as any).objectsList.forEach((element: any) => {
            timeMethod(element, 'updateSize', 'labelSize');
            timeMethod(element, 'updateCurve', 'curveSampling');
        });
    }
    if (diagnostics.checked) {
        const instrument = (object: any, name: string, count: keyof typeof counts, elapsed?: keyof typeof counts) => {
            if (typeof object[name] !== 'function') return;
            const hadOwn = Object.prototype.hasOwnProperty.call(object, name);
            const original = object[name];
            object[name] = function (...args: any[]) {
                counts[count]++;
                const start = elapsed ? performance.now() : 0;
                try { return original.apply(this, args); }
                finally { if (elapsed) counts[elapsed] += performance.now() - start; }
            };
            originals.push(() => { if (hadOwn) object[name] = original; else delete object[name]; });
        };
        instrument(curve, 'eval', 'evalCalls', 'evalMilliseconds');
        instrument(curve, 'decasteljau', 'constructionTables', 'constructionTableMilliseconds');
        instrument(curve, 'decasteljauScheme', 'constructionSchemes', 'constructionSchemeMilliseconds');
        instrument(curve, 'evaluatePoint', 'pointEvaluations', 'pointEvaluationMilliseconds');
        instrument(board, 'update', 'boardUpdates');
    }
    restoreDiagnostics = () => originals.reverse().forEach(restore => restore());
    const frames: number[] = [], updates: number[] = [];
    let previous: number | undefined;
    let initial: number | undefined;
    let frame = -60; // One second of warm-up at 60 Hz; collect the following 240 frames.
    let rejected: string | undefined;
    status.textContent = 'Running — warm-up, then 240 measured frames';
    try {
        await new Promise<void>(resolve => {
            const step = (time: number) => {
                if (cancelled || document.hidden) {
                    rejected = 'Run cancelled: keep the page visible for comparable frame measurements';
                    resolve();
                    return;
                }
                if (initial === undefined) initial = time;
                if (frame >= 0 && previous !== undefined) frames.push(time - previous);
                previous = time;
                const t = interaction === 'slider' ? (frame + 60) % 100 / 100 : (0.5 + (time - initial) * 0.0003) % 1;
                const start = performance.now();
                currentPhases = {elements: 0, renderer: 0, labelSize: 0, curveSampling: 0, constructionVisibility: 0};
                board.suspendUpdate();
                if (interaction === 'point') {
                    adapter.getJxgPoints()[1].setPosition(0, [originalPoints[1][0], originalPoints[1][1] + Math.sin((frame + 60) / 20)]);
                }
                if (interaction === 'weight' && curve instanceof RationalBezierCurve) {
                    const weights = [...originalWeights];
                    weights[1] += 0.4 * Math.sin((frame + 60) / 20);
                    curve.setWeights(weights);
                }
                graph.setState({t}, () => {
                    // componentDidUpdate completes the same board path as app animation/sliders.
                    if (frame >= 0) updates.push(performance.now() - start);
                    if (frame >= 0 && phaseTimings.checked) {
                        (Object.keys(phases) as Array<keyof typeof phases>).forEach(phase => phases[phase].push(currentPhases[phase]));
                    }
                    frame++;
                    if (frame < 240) frameId = requestAnimationFrame(step); else resolve();
                });
            };
            frameId = requestAnimationFrame(step);
        });
        if (!rejected) {
            const report = {
                scene: {name: sceneSelect.value, points: originalPoints,
                    weights: originalWeights.length ? originalWeights : undefined}, interaction,
                diagnostics: diagnostics.checked, browser: navigator.userAgent,
                viewport: [innerWidth, innerHeight], devicePixelRatio,
                production: process.env.NODE_ENV === 'production', warmupFrames: 60,
                evaluatorSource: process.env.BEZIER_BENCHMARK_SOURCE,
                constructionVisible: adapter.isShowingDecasteljauScheme(),
                labelsVisible: VisibilityContext.pointsVisible(), wholeCurve: !!graph.state.wholeCurve,
                appControlsLocked: true, cpuThrottling: 'none configured by benchmark; record external throttling separately',
                benchmarkVersion: 3, updateExperiment: regularUpdate.checked ? 'regular' : 'full',
                visibilityExperiment: stableVisibility.checked ? 'stable' : 'original',
                samplingExperiment: visibleSampling.checked ? 'visible' : 'original',
                skippedHiddenCurveUpdatesIncludingWarmup: skippedHiddenCurveUpdates,
                phaseTimings: phaseTimings.checked ? {
                    elements: summary(phases.elements), renderer: summary(phases.renderer),
                    labelSize: summary(phases.labelSize),
                    curveSampling: summary(phases.curveSampling),
                    constructionVisibility: summary(phases.constructionVisibility),
                    note: 'Label sizing and curve sampling are included in elements time; phases do not measure paint. Timing wrappers add overhead.',
                    raw: phases
                } : undefined,
                frameMilliseconds: summary(frames), updateCompletionMilliseconds: summary(updates),
                // This is a proxy from a scripted input to synchronous update completion, not paint latency.
                framesAbove25ms: frames.filter(ms => ms > 25).length,
                rawFrameMilliseconds: frames, rawUpdateCompletionMilliseconds: updates,
                diagnosticCountsIncludingWarmup: diagnostics.checked ? counts : undefined,
                diagnosticTimingNote: diagnostics.checked
                    ? 'Hot-method wrappers add overhead. eval includes nested point evaluation; decasteljauScheme includes nested decasteljau.'
                    : undefined,
                timestamp: new Date().toISOString()
            };
            reports.push(report);
            output.textContent = JSON.stringify(reports, null, 2);
            status.textContent = `Complete — ${frames.length} frames; median ${report.frameMilliseconds.median.toFixed(2)} ms, p95 ${report.frameMilliseconds.p95.toFixed(2)} ms; update median ${report.updateCompletionMilliseconds.median.toFixed(2)} ms`;
        } else status.textContent = rejected;
    } finally {
        restoreDiagnostics();
        restoreDiagnostics = () => {};
        board.suspendUpdate();
        adapter.getJxgPoints()[1].setPosition(0, originalPoints[1]);
        if (curve instanceof RationalBezierCurve) curve.setWeights(originalWeights);
        graph.setState({t: 0.5});
        running = false;
        runButton.disabled = sceneSelect.disabled = interactionSelect.disabled = diagnostics.disabled = phaseTimings.disabled = regularUpdate.disabled = stableVisibility.disabled = visibleSampling.disabled = compareButton.disabled = false;
    }
}

sceneSelect.onchange = mount;
runButton.onclick = () => run().catch(error => { status.textContent = `Failed: ${error.message}`; });
compareButton.onclick = async () => {
    if (running) return;
    // Same scene, full updates, no other experimental changes. Keep timing
    // wrappers for attribution and export both runs together.
    diagnostics.checked = regularUpdate.checked = stableVisibility.checked = visibleSampling.checked = false;
    phaseTimings.checked = true;
    try {
        const beforeCount = reports.length;
        await run();
        if (reports.length === beforeCount) return; // cancelled/unsupported
        visibleSampling.checked = true;
        await run();
        if (reports.length === beforeCount + 2) status.textContent = 'Comparison complete — download results';
    } catch (error) {
        status.textContent = `Failed: ${(error as Error).message}`;
    }
};
saveButton.onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(reports, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bezier-benchmark.json';
    link.click();
    URL.revokeObjectURL(url);
};
window.addEventListener('pagehide', () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    restoreDiagnostics();
    root.unmount();
});
mount();
