# Randomness F1 task 01 handoff (worker)

Status: complete; acceptance 1-4 met. Nothing committed.

Files: src/random/pcg32.ts, samplers.ts, pcg32.test.ts, samplers.test.ts, scripts/random-pcg32-benchmark.cjs.

- Digest: FNV-1a 32 (little-endian bytes) of 10^6 draws, seed 42 = `471bc991`. Asserted for the BigInt generator and for a BigInt-free 16-bit-limb implementation in the test, which itself reproduces the six published outputs. No C compiler on this machine, so pcg32-demo was not rerun for the long stream.
- Benchmark (`node scripts/random-pcg32-benchmark.cjs`, BigInt, 5 runs): 96-115 ms per 10^6 draws (ADR says 108 ms).
- Mutations, each observed then restored (diff-checked): rotation `>>59n`->`>>58n`: 4 generator/sampler tests fail (reference outputs, other seeds, digest, uniformity); `below` rejection loop removed: 2 fail (injected rejection tests); `<`->`<=` in bernoulli: 1 fails (injected boundary draw). On fixed seeds `<=` differs only when a draw equals the threshold (about 2^-32 per draw), hence the injected generator.
- Checks: `just unit src/random` 18 tests pass; `just lint src/random` pass; tsc clean outside trig/locale.

Decisions: samplers return `{value, draws}`; `Uint32Source` interface allows injection. `createPcg32` snaps silently; `checkSeed(seed)` returns {seed, status, message}. Message is English text in the kernel; the UI should map `status` to localized text. `bernoulli` takes integer percent 0-100 (throws otherwise); `below` accepts m 1..2^32. walkStep uses the top bit. Samplers allocate a result object per call; task 02 runners may want an allocation-free path (not done).

Review repairs: vacuous test replaced by an injected m=100 test (low word 92 rejected, 96 accepted); `<` to `<=` in the rejection loop fails 3 tests, restored. Comments added for the pi/4 band and the digest anchor. No trailing whitespace. Unit and lint pass.
