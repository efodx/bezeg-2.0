'use strict';
/* Median of 20 runs of analyzeEpicycle and epicycleTrace (N = 50) for each outline. Usage: node scripts/epicycle-outlines/measure.cjs */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
    const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}});
    module._compile(out.outputText, filename);
};
const model = require(path.resolve(__dirname, '../../src/analysis/epicycleModel.ts'));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const time = (fn) => {
    const start = process.hrtime.bigint();
    fn();
    return Number(process.hrtime.bigint() - start) / 1e6;
};
for (const id of model.EPICYCLE_OUTLINE_IDS) {
    const m = model.epicycleExample(id);
    let analysis = model.analyzeEpicycle(m); // warm-up
    model.epicycleTrace(analysis, 50);
    const analyze = [];
    const trace = [];
    for (let i = 0; i < 20; i++) {
        analyze.push(time(() => { analysis = model.analyzeEpicycle(m); }));
        trace.push(time(() => model.epicycleTrace(analysis, 50)));
    }
    console.log(`${id} (${m.vertices.length} vertices): analyze ${median(analyze).toFixed(1)} ms, trace N=50 ${median(trace).toFixed(2)} ms`);
}
