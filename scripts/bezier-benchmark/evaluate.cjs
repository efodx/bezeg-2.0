// Supplementary Node benchmark of the actual TypeScript evaluator, without a browser.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const {performance} = require('perf_hooks');
const {execFileSync} = require('child_process');
const originalRef = process.argv[3];
const repository = path.resolve(__dirname, '../..');
const evaluatorFiles = ['src/bezeg/impl/curve/polynomial-bezier-curve.ts', 'src/bezeg/impl/curve/rational-bezier-curve.ts'];
require.extensions['.ts'] = (module, filename) => {
    const relative = path.relative(repository, filename).replace(/\\/g, '/');
    const source = originalRef && evaluatorFiles.includes(relative)
        ? execFileSync('git', ['show', `${originalRef}:${relative}`], {cwd: repository, encoding: 'utf8'})
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
let checksum = 0;
const results = scenes.map(scene => {
    const points = scene.points.map(([x, y]) => new PointImpl(x, y));
    const curve = scene.weights ? new RationalBezierCurve(points, [...scene.weights]) : new PolynomialBezierCurve(points);
    const redraw = (frame) => {
        points[1].setY(scene.points[1][1] + Math.sin(frame / 20));
        CacheContext.update();
        for (let i = 0; i <= 500; i++) {
            const t = i / 500;
            // Match the separate X and Y requests in the shared drawing adapter.
            checksum += curve.eval(t).X() + curve.eval(t).Y();
        }
    };
    for (let i = 0; i < 100; i++) redraw(i);
    const runs = [];
    for (let run = 0; run < 7; run++) {
        const start = performance.now();
        for (let frame = 0; frame < 200; frame++) redraw(frame);
        runs.push((performance.now() - start) / 200);
    }
    return {scene: scene.name, degree: points.length - 1, samples: 501, redrawsPerRun: 200,
        millisecondsPerRedraw: runs, median: quantile(runs, 0.5), p95: quantile(runs, 0.95)};
});
const report = {runtime: process.version, platform: process.platform, arch: process.arch,
    evaluatorSource: originalRef || 'working-tree', timestamp: new Date().toISOString(), results, checksum};
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
