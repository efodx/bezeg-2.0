// Replay measured frame intervals against an explicit investigation budget.
// A passing replay supplements, rather than replaces, device interaction review.
const fs = require('fs');
const [file, budgetArgument] = process.argv.slice(2);
const budget = Number(budgetArgument);
if (!file || !Number.isFinite(budget) || budget <= 0) {
    console.error('Usage: node scripts/bezier-benchmark/check-frames.cjs results.json median-budget-ms');
    process.exit(2);
}
const reports = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(reports) || reports.length === 0) throw new Error('Expected nonempty benchmark reports');
let failed = false;
reports.forEach(report => {
    if (report.diagnostics || report.phaseTimings) throw new Error('Use uninstrumented reports for acceptance timings');
    if ((report.updateExperiment && report.updateExperiment !== 'full') ||
        (report.visibilityExperiment && report.visibilityExperiment !== 'original') ||
        (report.samplingExperiment && report.samplingExperiment !== 'original')) {
        throw new Error('Benchmark-only experiments cannot establish application acceptance');
    }
    const frames = [...report.rawFrameMilliseconds].sort((a, b) => a - b);
    if (frames.length !== 240 || frames.some(frame => !Number.isFinite(frame) || frame <= 0)) {
        throw new Error('Expected 240 finite positive frame intervals');
    }
    const median = frames[Math.ceil(frames.length * .5) - 1];
    const p95 = frames[Math.ceil(frames.length * .95) - 1];
    const pass = median <= budget;
    failed ||= !pass;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${report.scene.name} ${report.evaluatorSource}: median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms; median budget ${budget} ms`);
});
process.exitCode = failed ? 1 : 0;
