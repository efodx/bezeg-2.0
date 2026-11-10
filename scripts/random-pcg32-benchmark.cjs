// Times 10^6 PCG32 draws (BigInt version) in node. Usage: node scripts/random-pcg32-benchmark.cjs
// Transpiles the TypeScript source with the repository's typescript package.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'random', 'pcg32.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { createPcg32 } = mod.exports;
for (let run = 0; run < 5; run++) {
  const rng = createPcg32(42);
  let acc = 0;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 1_000_000; i++) acc ^= rng.next();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`run ${run + 1}: 1e6 draws in ${ms.toFixed(1)} ms (xor ${acc >>> 0})`);
}
