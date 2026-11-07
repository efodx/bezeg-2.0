import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createScratch, createWorld, measureWorld, stepWorld} from '../../../compgeo/collisions/world'
import {createWorkerLoop, STEP_REAL_MS} from './collisionLoop'
import type {CollisionEvent, CollisionSnapshot} from './collisionProtocol'

interface Posted {
  event: CollisionEvent
  transfer: ArrayBuffer[]
}

function setup(clockIncrement = 0) {
  const posted: Posted[] = []
  let clock = 0
  const loop = createWorkerLoop(
    (event, transfer) => posted.push({event, transfer}),
    (fn, delayMs) => {
      const handle = setTimeout(fn, delayMs)
      return () => clearTimeout(handle)
    },
    () => (clock += clockIncrement),
  )
  const snapshots = (): CollisionSnapshot[] =>
    posted.flatMap((p) => (p.event.type === 'snapshot' ? [p.event] : []))
  return {loop, posted, snapshots}
}

const init = {type: 'init', seed: 5, count: 30, method: 'naive', playing: false} as const

describe('createWorkerLoop', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('posts a fresh snapshot on init and schedules nothing while paused', () => {
    const {loop, snapshots} = setup()
    loop.handle(init)
    expect(snapshots()).toHaveLength(1)
    expect(snapshots()[0]).toMatchObject({stepIndex: 0, count: 30, seed: 5, method: 'naive', simSpeed: 100})
    expect(snapshots()[0].positions).toHaveLength(60)
    expect(snapshots()[0].radii).toHaveLength(30)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('posts one snapshot with the new method and its counters when paused, without stepping', () => {
    const {loop, snapshots} = setup()
    loop.handle({...init, count: 200})
    loop.handle({type: 'stepOnce'})
    const before = snapshots()
    const prev = before[before.length - 1]
    loop.handle({type: 'setMethod', method: 'sweep'})
    const after = snapshots()
    expect(after).toHaveLength(before.length + 1)
    const s = after[after.length - 1]
    expect(s).toMatchObject({method: 'sweep', count: 200, stepIndex: prev.stepIndex, simSpeed: prev.simSpeed})
    expect(Array.from(s.positions)).toEqual(Array.from(prev.positions))
    const world = createWorld({seed: 5, count: 200})
    stepWorld(world, 'naive', createScratch(200))
    const expected = measureWorld(world, 'sweep', createScratch(200))
    expect(s.counters).toEqual(expected.counters)
    expect(Array.from(s.touching)).toEqual(Array.from(expected.touching))
    expect(s.counters.boxTests).toBeLessThan(prev.counters.boxTests)
    expect(s.counters.touchingPairs).toBe(prev.counters.touchingPairs)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('transfers the three typed arrays of every snapshot', () => {
    const {loop, posted} = setup()
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(1)
    const last = posted[posted.length - 1]
    expect(last.event.type).toBe('snapshot')
    if (last.event.type !== 'snapshot') return
    expect(last.transfer).toEqual([last.event.positions.buffer, last.event.radii.buffer, last.event.touching.buffer])
  })

  it('steps by the fixed time step and matches the pure model', () => {
    const {loop, snapshots} = setup()
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(0)
    loop.handle({type: 'pause'})
    const s = snapshots()[snapshots().length - 1]
    const world = createWorld({seed: 5, count: 30})
    const result = stepWorld(world, 'naive', createScratch(30))
    expect(s.stepIndex).toBe(1)
    expect(s.positions[0]).toBe(Math.fround(world.x[0]))
    expect(s.positions[1]).toBe(Math.fround(world.y[0]))
    expect(s.counters).toEqual(result.counters)
  })

  it('paces to real time when steps are fast', () => {
    const {loop, snapshots} = setup(0)
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(STEP_REAL_MS * 6 + 1)
    const steps = snapshots()[snapshots().length - 1].stepIndex
    expect(steps).toBeGreaterThanOrEqual(6)
    expect(steps).toBeLessThanOrEqual(7)
  })

  it('does not catch up after a slow step: one time step per tick and a reduced simSpeed', () => {
    const {loop, snapshots} = setup(100) // every step "takes" 100 ms
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(0)
    expect(snapshots()[snapshots().length - 1].stepIndex).toBe(1)
    vi.advanceTimersByTime(1)
    vi.advanceTimersByTime(1)
    const s = snapshots()[snapshots().length - 1]
    expect(s.stepIndex).toBe(3)
    expect(s.stepMs).toBe(100)
    expect(s.simSpeed).toBeCloseTo((STEP_REAL_MS / 100) * 100, 6)
    const world = createWorld({seed: 5, count: 30})
    const scratch = createScratch(30)
    for (let i = 0; i < 3; i++) stepWorld(world, 'naive', scratch)
    expect(s.positions[0]).toBe(Math.fround(world.x[0]))
  })

  it('caps simSpeed at 100 for fast steps', () => {
    const {loop, snapshots} = setup(1)
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(0)
    expect(snapshots()[snapshots().length - 1].simSpeed).toBe(100)
  })

  it('applies commands between steps in arrival order', () => {
    const {loop, snapshots} = setup()
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(0)
    expect(snapshots().map((s) => s.stepIndex)).toEqual([0, 1])
    loop.handle({type: 'setCount', count: 10})
    loop.handle({type: 'setOverlay', overlay: 'sweep'})
    loop.handle({type: 'setMethod', method: 'sweep'})
    vi.advanceTimersByTime(STEP_REAL_MS + 1)
    const after = snapshots().slice(2)
    expect(after[0]).toMatchObject({stepIndex: 0, count: 10, overlay: 'none'})
    expect(after[1]).toMatchObject({stepIndex: 1, count: 10, overlay: 'sweep', method: 'sweep'})
  })

  it('clamps counts to the method limit and reports the request once', () => {
    const {loop, snapshots} = setup()
    loop.handle(init)
    loop.handle({type: 'setCount', count: 9000})
    expect(snapshots()[1]).toMatchObject({count: 4000, clampedFrom: 9000})
    loop.handle({type: 'reset'})
    expect(snapshots()[2]).toMatchObject({count: 4000, clampedFrom: null})
    loop.handle({type: 'setMethod', method: 'sweep'})
    expect(snapshots()[3]).toMatchObject({count: 4000, clampedFrom: null, method: 'sweep'})
    loop.handle({type: 'setCount', count: 9000})
    expect(snapshots()[4]).toMatchObject({count: 5000, clampedFrom: 9000})
    loop.handle({type: 'setMethod', method: 'naive'})
    expect(snapshots()[5]).toMatchObject({count: 4000, clampedFrom: 5000, method: 'naive'})
    loop.handle({type: 'setCount', count: 0})
    expect(snapshots()[6]).toMatchObject({count: 1, clampedFrom: 0})
  })

  it('stops scheduling on pause and resumes on play', () => {
    const {loop, snapshots} = setup()
    loop.handle({...init, playing: true})
    vi.advanceTimersByTime(0)
    loop.handle({type: 'pause'})
    expect(vi.getTimerCount()).toBe(0)
    const before = snapshots().length
    vi.advanceTimersByTime(1000)
    expect(snapshots()).toHaveLength(before)
    loop.handle({type: 'play'})
    vi.advanceTimersByTime(0)
    expect(snapshots()).toHaveLength(before + 1)
  })

  it('steps once while paused and ignores stepOnce while playing', () => {
    const {loop, snapshots} = setup()
    loop.handle(init)
    loop.handle({type: 'stepOnce'})
    expect(snapshots().map((s) => s.stepIndex)).toEqual([0, 1])
    loop.handle({type: 'play'})
    loop.handle({type: 'stepOnce'})
    expect(snapshots()).toHaveLength(2)
  })

  it('reset with a seed builds that world', () => {
    const {loop, snapshots} = setup()
    loop.handle(init)
    loop.handle({type: 'reset', seed: 9})
    const s = snapshots()[1]
    const world = createWorld({seed: 9, count: 30})
    expect(s.seed).toBe(9)
    expect(s.positions[0]).toBe(Math.fround(world.x[0]))
  })

  it('ignores commands other than init before the first init', () => {
    const {loop, posted} = setup()
    loop.handle({type: 'play'})
    loop.handle({type: 'setCount', count: 5})
    loop.handle({type: 'stepOnce'})
    expect(posted).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
