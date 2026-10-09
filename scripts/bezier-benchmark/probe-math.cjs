// Compare the current point evaluator with a benchmark-only scratch-row candidate
// and measure complete De Casteljau table construction separately.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const {execFileSync} = require('child_process');
const {performance, PerformanceObserver} = require('perf_hooks');
const evaluatorRef = process.argv[3];
const evaluatorFiles = ['src/bezeg/impl/curve/polynomial-bezier-curve.ts', 'src/bezeg/impl/curve/rational-bezier-curve.ts'];

const repository = path.resolve(__dirname, '../..');
require.extensions['.ts'] = (module, filename) => {
    const relative = path.relative(repository, filename).replace(/\\/g, '/');
    const source = evaluatorRef && evaluatorFiles.includes(relative)
        ? execFileSync('git', ['show', `${evaluatorRef}:${relative}`], {cwd: repository, encoding: 'utf8'})
        : fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019}
    }).outputText, filename);
};
const {PolynomialBezierCurve} = require('../../src/bezeg/impl/curve/polynomial-bezier-curve.ts');
const {RationalBezierCurve} = require('../../src/bezeg/impl/curve/rational-bezier-curve.ts');
const {PointImpl} = require('../../src/bezeg/impl/point/point-impl.ts');
const {CacheContext} = require('../../src/graphs/context/CacheContext.ts');
const scenes = require('./scenes.json');

const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1];
const originalEval = PolynomialBezierCurve.prototype.eval;
const scratchRows = new WeakMap();
const scratchEval = function (t) {
    const currentContext = CacheContext.context;
    if (currentContext !== this.lastCacheContext) {
        this.cachedPoints.clear();
        this.lastCacheContext = currentContext;
    }
    const cached = this.cachedPoints.get(t);
    if (cached !== undefined) return cached;

    if (this.points.length < 5) {
        const pointsAtT = this.points.map(point => [point.X(), point.Y()]);
        const point = this.evaluatePoint(t, pointsAtT);
        this.cachedPoints.set(t, point);
        return point;
    }
    let rows = scratchRows.get(this);
    if (!rows || rows.length !== this.points.length) {
        rows = Array.from({length: this.points.length}, () => [0, 0]);
        scratchRows.set(this, rows);
    }
    for (let i = 0; i < this.points.length; i++) {
        rows[i][0] = this.points[i].X();
        rows[i][1] = this.points[i].Y();
    }
    const point = this.evaluatePoint(t, rows);
    this.cachedPoints.set(t, point);
    return point;
};

const observerEvents = [];
const gcObserver = new PerformanceObserver(list => observerEvents.push(...list.getEntries()));
let gcObserverAvailable = false;
try { gcObserver.observe({entryTypes: ['gc']}); gcObserverAvailable = true; } catch (_) { /* Runtime does not expose GC entries. */ }

function createCurve(scene) {
    const points = scene.points.map(([x, y]) => new PointImpl(x, y));
    const curve = scene.weights
        ? new RationalBezierCurve(points, [...scene.weights])
        : new PolynomialBezierCurve(points);
    return {points, curve};
}

function draw(curve, points, scene, frame) {
    points[1].setY(scene.points[1][1] + Math.sin(frame / 20));
    CacheContext.update();
    let checksum = 0;
    for (let i = 0; i <= 500; i++) {
        const t = i / 500;
        // Match separate X/Y callback requests through the curve cache.
        checksum += curve.eval(t).X() + curve.eval(t).Y();
    }
    return checksum;
}

async function nextTurn() { await new Promise(resolve => setImmediate(resolve)); }

async function benchmarkEvaluators(scene) {
    const variants = {};
    for (const variant of ['current', 'scratch-rows']) {
        PolynomialBezierCurve.prototype.eval = variant === 'scratch-rows' ? scratchEval : originalEval;
        const {points, curve} = createCurve(scene);
        let checksum = 0;
        for (let frame = 0; frame < 100; frame++) checksum += draw(curve, points, scene, frame);
        variants[variant] = {points, curve, checksum, runs: [], windows: []};
    }
    await nextTurn();

    for (let run = 0; run < 7; run++) {
        const order = run % 2 ? ['scratch-rows', 'current'] : ['current', 'scratch-rows'];
        for (const variant of order) {
            const measured = variants[variant];
            PolynomialBezierCurve.prototype.eval = variant === 'scratch-rows' ? scratchEval : originalEval;
            const start = performance.now();
            for (let frame = 0; frame < 200; frame++) measured.checksum += draw(measured.curve, measured.points, scene, frame);
            const end = performance.now();
            measured.runs.push((end - start) / 200);
            measured.windows.push({start, end});
            await nextTurn();
        }
    }

    return Object.fromEntries(Object.entries(variants).map(([variant, measured]) => {
        const gc = observerEvents.filter(entry => entry.entryType === 'gc' && measured.windows.some(window =>
            entry.startTime >= window.start && entry.startTime <= window.end));
        return [variant, {
            millisecondsPerRedraw: measured.runs,
            median: quantile(measured.runs, 0.5),
            p95: quantile(measured.runs, 0.95),
            gcCount: gc.length,
            gcDurationMs: gc.reduce((sum, entry) => sum + entry.duration, 0),
            checksum: measured.checksum
        }];
    }));
}

async function benchmarkConstruction(scene) {
    PolynomialBezierCurve.prototype.eval = originalEval;
    const {curve} = createCurve(scene);
    const runCalls = 5000;
    let checksum = 0;
    const runs = [];
    for (let run = 0; run < 7; run++) {
        const start = performance.now();
        for (let i = 0; i < runCalls; i++) {
            const table = curve.decasteljauScheme((i % 1000) / 999);
            const final = table[table.length - 1][0];
            checksum += final.X() + final.Y();
        }
        runs.push((performance.now() - start) / runCalls);
    }
    return {
        callsPerRun: runCalls,
        millisecondsPerTable: runs,
        median: quantile(runs, 0.5),
        p95: quantile(runs, 0.95),
        checksum
    };
}

(async () => {
    const results = [];
    for (const scene of scenes) {
        results.push({
            scene: scene.name,
            controlPoints: scene.points.length,
            weights: scene.weights?.length ?? 0,
            evaluator: await benchmarkEvaluators(scene),
            fullTable: await benchmarkConstruction(scene)
        });
    }

    const report = {
        sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repository, encoding: 'utf8'}).trim(),
        baselineEvaluatorSource: evaluatorRef || 'working-tree',
        sourceState: 'benchmark-only scratch rows for curves with five or more control points',
        runtime: process.version,
        platform: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString(),
        warmupRedraws: 100,
        runs: 7,
        redrawsPerRun: 200,
        samplesPerRedraw: 501,
        constructionTableCallsPerRun: 5000,
        gcObserverAvailable,
        results
    };
    gcObserver.disconnect();
    const outputPath = process.argv[2] && path.resolve(process.argv[2]);
    if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
})().catch(error => {
    gcObserver.disconnect();
    console.error(error);
    process.exitCode = 1;
});
