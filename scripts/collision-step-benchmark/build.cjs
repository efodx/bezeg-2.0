// Production bundle of the collision step benchmark into .benchmark-output/collision-step. No app change.
const path = require('path');
const output = path.resolve(__dirname, '../../.benchmark-output/collision-step');
(async () => {
    const {build} = await import('vite');
    await build({
        configFile: false, root: __dirname, base: './', logLevel: 'warn',
        build: {outDir: output, emptyOutDir: true, chunkSizeWarningLimit: 4000},
        worker: {format: 'es'},
    });
    console.log('Production benchmark built in .benchmark-output/collision-step');
})().catch(error => { console.error(error); process.exitCode = 1; });
