// Usage: node scripts/projective-conic-benchmark/run.cjs [results.json] [summary.md]   (build first with build.cjs)
const os = require('os');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {pathToFileURL} = require('url');

const dir = path.resolve(__dirname, '../../.benchmark-output/projective-conic') + '/';
const jsonFile = process.argv[2] || dir + 'projective-conic-bench.json';
const mdFile = process.argv[3] || dir + 'projective-conic-bench.md';
const sh = command => { try { return execSync(command, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); } catch { return 'unavailable'; } };

(async () => {
    const bundle = path.resolve(__dirname, '../../.benchmark-output/projective-conic/bench.mjs');
    const {runBenchmark, renderMarkdown} = await import(pathToFileURL(bundle).href);
    const env = {
        node: process.version, cpu: `${os.cpus()[0].model} (${os.cpus().length} threads)`, os: `${os.type()} ${os.release()} ${os.arch()}`,
        gitHead: sh('git rev-parse --short HEAD'), date: new Date().toISOString(),
    };
    const results = runBenchmark(s => console.log(s));
    for (const file of [jsonFile, mdFile]) fs.mkdirSync(path.dirname(path.resolve(file)), {recursive: true});
    fs.writeFileSync(jsonFile, JSON.stringify({env, ...results}, null, 1));
    fs.writeFileSync(mdFile, renderMarkdown(results, env));
    console.log(`Wrote ${jsonFile} and ${mdFile}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
