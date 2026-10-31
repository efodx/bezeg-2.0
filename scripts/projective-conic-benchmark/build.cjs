// Bundles bench.ts (and the src/ modules it reads) into .benchmark-output/projective-conic/bench.mjs for node. No app change.
const path = require('path');
const output = path.resolve(__dirname, '../../.benchmark-output/projective-conic');
(async () => {
    const {build} = await import('vite');
    await build({
        configFile: false, root: __dirname, logLevel: 'warn',
        ssr: {noExternal: true},
        build: {
            ssr: path.resolve(__dirname, 'bench.ts'), outDir: output, emptyOutDir: true, target: 'node20', minify: false,
            rollupOptions: {output: {format: 'es', entryFileNames: 'bench.mjs'}},
        },
    });
    console.log('Benchmark bundle built in .benchmark-output/projective-conic');
})().catch(error => { console.error(error); process.exitCode = 1; });
