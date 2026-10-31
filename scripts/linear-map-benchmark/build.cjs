// Production bundle of the grid drawing benchmark into .benchmark-output/linear-map. No app change.
const path = require('path');
const output = path.resolve(__dirname, '../../.benchmark-output/linear-map');
(async () => {
    const {build} = await import('vite');
    await build({
        configFile: false, root: __dirname, base: './', logLevel: 'warn',
        build: {outDir: output, emptyOutDir: true, chunkSizeWarningLimit: 4000},
    });
    console.log('Production benchmark built in .benchmark-output/linear-map');
})().catch(error => { console.error(error); process.exitCode = 1; });
