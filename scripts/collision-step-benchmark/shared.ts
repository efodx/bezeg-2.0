// Measurement code shared by the worker entry and the main-thread fallback. Calls stepWorld directly (not
// createWorkerLoop) because the CP2 worker clamps the count to MAX_COUNT, which would block naive cells above the
// provisional limit. The timing equals the loop's stepMs: performance.now around stepWorld.
import {createScratch, createWorld, stepWorld} from '../../src/compgeo/collisions/world'
import type {BroadPhaseMethod} from '../../src/compgeo/collisions/world'

export type BenchRequest =
    | {type: 'calibrate'}
    | {type: 'run'; method: BroadPhaseMethod; count: number; warmup: number; steps: number; seed: number}
export type BenchResponse =
    | {type: 'calibrate'; ms: number}
    | {type: 'run'; times: number[]; boxTests: number[]; candidates: number[]; narrowTests: number[]; touchingPairs: number[]}

/** Fixed CPU work; its wall time scales with CPU throttling. */
function spin(): number {
    let x = 0
    for (let i = 0; i < 30_000_000; i++) x = (x + Math.sqrt(i)) % 1000
    return x
}

export function handleBench(message: BenchRequest): BenchResponse {
    if (message.type === 'calibrate') {
        spin()
        const t0 = performance.now()
        spin()
        return {type: 'calibrate', ms: performance.now() - t0}
    }
    const world = createWorld({seed: message.seed, count: message.count})
    const scratch = createScratch(message.count)
    const out = {times: [] as number[], boxTests: [] as number[], candidates: [] as number[], narrowTests: [] as number[], touchingPairs: [] as number[]}
    for (let i = 0; i < message.warmup + message.steps; i++) {
        const t0 = performance.now()
        const result = stepWorld(world, message.method, scratch)
        const ms = performance.now() - t0
        if (i < message.warmup) continue
        out.times.push(ms)
        out.boxTests.push(result.counters.boxTests)
        out.candidates.push(result.counters.candidates)
        out.narrowTests.push(result.counters.narrowTests)
        out.touchingPairs.push(result.counters.touchingPairs)
    }
    return {type: 'run', ...out}
}
