import {createScratch, createWorld, measureWorld, stepWorld, TIME_STEP} from '../../../compgeo/collisions/world'
import type {StepCounters, StepScratch, World} from '../../../compgeo/collisions/world'
import {clampCount, snapshotTransferables} from './collisionProtocol'
import type {
  BroadPhaseMethod,
  CollisionCommand,
  CollisionEvent,
  CollisionOverlay,
  CollisionSnapshot,
  WorldShape,
} from './collisionProtocol'

/** Real time of one simulated step (ms). */
export const STEP_REAL_MS = TIME_STEP * 1000

/** Runs `fn` after `delayMs` and returns a function that cancels it. */
export type Schedule = (fn: () => void, delayMs: number) => () => void

export interface WorkerLoop {
  handle(command: CollisionCommand): void
}

/**
 * The worker's logic without the worker globals. A command is applied the moment it arrives, which is between steps
 * because a step runs synchronously. After each posted step the next one is scheduled, so queued commands interleave.
 * Each step advances exactly one TIME_STEP, however long it took: there is no catch-up.
 */
export function createWorkerLoop(
  post: (event: CollisionEvent, transfer: ArrayBuffer[]) => void,
  schedule: Schedule,
  now: () => number = () => performance.now(),
): WorkerLoop {
  let seed = 1
  let count = 0
  let method: BroadPhaseMethod = 'naive'
  let overlay: CollisionOverlay = 'none'
  let shape: WorldShape = 'circle'
  let world: World | null = null
  let scratch: StepScratch | null = null
  let stepIndex = 0
  let playing = false
  let cancelNext: (() => void) | null = null
  let clampedFrom: number | null = null
  let lastSimSpeed = 100

  const emit = (event: CollisionEvent): void => {
    post(event, event.type === 'snapshot' ? snapshotTransferables(event) : [])
  }

  const postSnapshot = (touching: Uint8Array, counters: StepCounters, stepMs: number, simSpeed: number): void => {
    if (!world) return
    const n = world.count
    const positions = new Float32Array(2 * n)
    const radii = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      positions[2 * i] = world.x[i]
      positions[2 * i + 1] = world.y[i]
      radii[i] = world.r[i]
    }
    const snapshot: CollisionSnapshot = {
      type: 'snapshot',
      stepIndex,
      count: n,
      method,
      shape,
      seed,
      positions,
      radii,
      templates: shape === 'polygon' ? Uint8Array.from(world.template) : new Uint8Array(0),
      scale: world.scale,
      touching: touching.slice(0, n),
      counters: {...counters},
      stepMs,
      simSpeed,
      overlay,
      clampedFrom,
    }
    clampedFrom = null
    lastSimSpeed = simSpeed
    emit(snapshot)
  }

  const rebuild = (): void => {
    world = createWorld({seed, count, shape})
    scratch = createScratch(count)
    stepIndex = 0
    // Measure the new arrangement without stepping, so the readouts describe it rather than showing zero tests (and,
    // for polygons, every pair as removed by the boxes) until the next step. Speed is derived as after a step.
    const t0 = now()
    const result = measureWorld(world, method, scratch)
    const stepMs = now() - t0
    postSnapshot(result.touching, result.counters, stepMs, stepMs <= STEP_REAL_MS ? 100 : (STEP_REAL_MS / stepMs) * 100)
  }

  const setCount = (requested: number): void => {
    const applied = clampCount(requested, method, shape)
    clampedFrom = applied !== requested ? requested : null
    count = applied
  }

  const step = (): void => {
    if (!world || !scratch) return
    const t0 = now()
    const result = stepWorld(world, method, scratch)
    const stepMs = now() - t0
    stepIndex++
    const simSpeed = stepMs <= STEP_REAL_MS ? 100 : (STEP_REAL_MS / stepMs) * 100
    postSnapshot(result.touching, result.counters, stepMs, simSpeed)
  }

  const scheduleNext = (delayMs: number): void => {
    cancelNext?.()
    cancelNext = schedule(tick, delayMs)
  }

  function tick(): void {
    cancelNext = null
    if (!playing) return
    const t0 = now()
    try {
      step()
    } catch (error) {
      playing = false
      emit({type: 'error', message: error instanceof Error ? error.message : String(error)})
      return
    }
    // Pace to real time when steps are faster than one frame; otherwise yield with a zero delay.
    scheduleNext(Math.max(0, STEP_REAL_MS - (now() - t0)))
  }

  const stop = (): void => {
    playing = false
    cancelNext?.()
    cancelNext = null
  }

  return {
    handle(command) {
      switch (command.type) {
        case 'init':
          stop()
          seed = command.seed
          method = command.method
          shape = command.shape ?? 'circle'
          overlay = command.overlay ?? 'none'
          setCount(command.count)
          rebuild()
          if (command.playing) {
            playing = true
            scheduleNext(0)
          }
          break
        case 'setCount':
          if (!world) return
          setCount(command.count)
          rebuild()
          break
        case 'setMethod':
          if (!world) return
          method = command.method
          if (count > clampCount(count, method, shape)) {
            setCount(count)
            rebuild()
          } else if (scratch && !playing) {
            // Paused only: while playing, the next step's snapshot carries the method. Re-measure the current positions with the new method, without stepping. stepIndex is unchanged, simSpeed
            // keeps the last posted value (no step was timed) and stepMs is the measurement's own time.
            const t0 = now()
            const result = measureWorld(world, method, scratch)
            postSnapshot(result.touching, result.counters, now() - t0, lastSimSpeed)
          }
          break
        case 'play':
          if (!world || playing) return
          playing = true
          scheduleNext(0)
          break
        case 'pause':
          stop()
          break
        case 'stepOnce':
          if (world && !playing) step()
          break
        case 'reset':
          if (!world) return
          if (command.seed !== undefined) seed = command.seed
          rebuild()
          break
        case 'setOverlay':
          overlay = command.overlay
          break
      }
    },
  }
}
