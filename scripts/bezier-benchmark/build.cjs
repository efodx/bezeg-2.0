// Separate production diagnostic bundle. No app route or normal UI changes.
const path = require('path');
const {execFileSync} = require('child_process');
const label = process.argv[2] || 'current';
if (!['before', 'after', 'current'].includes(label)) throw new Error('Use before, after, or current');
const ref = process.argv[3];
if (label === 'before' && !ref) throw new Error('Pass the original commit as the third argument when building before');
const repoRoot = path.resolve(__dirname, '../..');
const output = path.resolve(repoRoot, '.benchmark-output', label);

// Restore only the two evaluator sources in the bundle; never change the checkout.
function baselineEvaluators(commit) {
    const evaluators = ['src/bezeg/impl/curve/polynomial-bezier-curve.ts', 'src/bezeg/impl/curve/rational-bezier-curve.ts'];
    return {
        name: 'bezier-benchmark-baseline',
        enforce: 'pre',
        load(id) {
            const relative = path.relative(repoRoot, id.split('?')[0]).replace(/\\/g, '/');
            if (!evaluators.includes(relative)) return null;
            return execFileSync('git', ['show', `${commit}:${relative}`], {cwd: repoRoot, encoding: 'utf8'});
        },
    };
}

(async () => {
    const {build} = await import('vite');
    const {default: react} = await import('@vitejs/plugin-react');
    await build({
        configFile: false,
        root: __dirname,
        base: './',
        logLevel: 'warn',
        plugins: [react(), ...(label === 'before' ? [baselineEvaluators(ref)] : [])],
        define: {'process.env.BEZIER_BENCHMARK_SOURCE': JSON.stringify(label === 'before' ? ref : 'working-tree')},
        build: {outDir: output, emptyOutDir: true, chunkSizeWarningLimit: 4000},
    });
    console.log(`Production benchmark built in .benchmark-output/${label}`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
