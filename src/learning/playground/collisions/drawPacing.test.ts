import {describe, expect, it} from 'vitest'
import {createDrawPacer, LOADED_ENTER_MS, MIN_LOADED_GAP_MS} from './drawPacing'

/** Feeds frames at a fixed interval and returns the times at which the pacer allowed a draw. */
function run(pacer: ReturnType<typeof createDrawPacer>, start: number, interval: number, frames: number): number[] {
  const drawn: number[] = []
  for (let i = 0; i < frames; i++) {
    const now = start + i * interval
    if (pacer.shouldDraw(now)) drawn.push(now)
  }
  return drawn
}

describe('draw pacing', () => {
  it('draws every frame while the main thread keeps up, at 60 and 120 Hz', () => {
    expect(run(createDrawPacer(), 0, 1000 / 60, 120)).toHaveLength(120)
    expect(run(createDrawPacer(), 0, 1000 / 120, 240)).toHaveLength(240)
  })

  it('draws every frame through a single slow frame', () => {
    const pacer = createDrawPacer()
    const before = run(pacer, 0, 16.7, 60)
    expect(pacer.shouldDraw(60 * 16.7 + 60)).toBe(true)
    expect(before).toHaveLength(60)
  })

  it('keeps at least 33 ms between draws once frames come slower than the load threshold', () => {
    const pacer = createDrawPacer()
    const drawn = run(pacer, 0, 25, 200)
    const late = drawn.filter((t) => t > 1000)
    expect(late.length).toBeGreaterThan(10)
    for (let i = 1; i < late.length; i++) expect(late[i] - late[i - 1]).toBeGreaterThanOrEqual(MIN_LOADED_GAP_MS)
    expect(drawn.length).toBeLessThan(160)
  })

  it('draws every frame again after the load drops', () => {
    const pacer = createDrawPacer()
    // Load: 30 ms frames push the average above the threshold.
    run(pacer, 0, 30, 40)
    expect(30).toBeGreaterThan(LOADED_ENTER_MS)
    // The load drops: frames at 16.7 ms. After the hold, every frame is drawn again.
    const start = 40 * 30
    const drawn = run(pacer, start, 16.7, 400)
    const tail = drawn.filter((t) => t > start + 3000)
    expect(tail.length).toBeGreaterThan(100)
    const gaps = tail.slice(1).map((t, i) => t - tail[i])
    expect(Math.max(...gaps)).toBeLessThan(20)
  })

  it('ignores the long gap of a hidden tab', () => {
    const pacer = createDrawPacer()
    run(pacer, 0, 16.7, 60)
    expect(pacer.shouldDraw(60 * 16.7 + 60000)).toBe(true)
    expect(pacer.shouldDraw(60 * 16.7 + 60000 + 16.7)).toBe(true)
  })
})
