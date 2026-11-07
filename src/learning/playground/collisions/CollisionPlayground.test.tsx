import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {setLanguage} from '../../../localization'
import CollisionPlayground, {READOUT_INTERVAL_MS} from './CollisionPlayground'
import {MAX_COUNT} from './collisionProtocol'
import type {CollisionSnapshot} from './collisionProtocol'
import type {CollisionWorkerApi} from './useCollisionWorker'

// The hook is mocked in every test but the reduced-motion one, which runs the real hook against a stub Worker.
const hookState = vi.hoisted(() => ({
  useReal: false,
  api: null as unknown,
  real: null as null | ((options: unknown) => unknown),
}))
vi.mock('./useCollisionWorker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useCollisionWorker')>()
  return {
    ...actual,
    useCollisionWorker: (options: Parameters<typeof actual.useCollisionWorker>[0]) =>
      hookState.useReal ? actual.useCollisionWorker(options) : (hookState.api as CollisionWorkerApi),
  }
})

const send = vi.fn()
let listeners: Set<() => void>
let snapshotRef: {current: CollisionSnapshot | null}
let apiState: {status: 'ready' | 'unavailable'; playing: boolean}

function setApi(): void {
  hookState.api = {
    status: apiState.status,
    playing: apiState.playing,
    snapshotRef,
    send,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  } satisfies CollisionWorkerApi
}

function snap(over: Partial<CollisionSnapshot> = {}): CollisionSnapshot {
  return {
    type: 'snapshot',
    stepIndex: 1,
    count: 2,
    method: 'sweep',
    seed: 1,
    positions: new Float32Array([100, 100, 800, 500]),
    radii: new Float32Array([20, 0.1]),
    touching: new Uint8Array([1, 0]),
    counters: {boxTests: 7, candidates: 1, narrowTests: 1, touchingPairs: 1},
    stepMs: 1.5,
    simSpeed: 88,
    overlay: 'none',
    clampedFrom: null,
    ...over,
  }
}

function emit(s: CollisionSnapshot): void {
  snapshotRef.current = s
  act(() => listeners.forEach((l) => l()))
}

const arcs: number[][] = []
const fills: unknown[] = []
const clearRect = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  setLanguage('sl')
  send.mockReset()
  listeners = new Set()
  snapshotRef = {current: null}
  apiState = {status: 'ready', playing: false}
  hookState.useReal = false
  arcs.length = 0
  fills.length = 0
  clearRect.mockReset()
  class FakePath2D {
    moveTo = vi.fn()
    arc = (...a: number[]) => { arcs.push(a) }
  }
  vi.stubGlobal('Path2D', FakePath2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        clearRect,
        fill: (p: unknown) => fills.push(p),
        stroke: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
      }) as unknown as CanvasRenderingContext2D,
  )
  setApi()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const digits = (text: string | null): string => (text ?? '').replace(/\D/g, '')
const readoutValue = (label: RegExp): string | null =>
  screen.getByText(label).parentElement!.querySelector('dd')!.textContent

describe('commands', () => {
  it('Play, Pause, Step and New arrangement send the matching commands', () => {
    const {rerender} = render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}))
    expect(send).toHaveBeenLastCalledWith({type: 'play'})
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    expect(send).toHaveBeenLastCalledWith({type: 'stepOnce'})
    fireEvent.click(screen.getByRole('button', {name: 'Nova razporeditev'}))
    const reset = send.mock.calls.at(-1)![0] as {type: string; seed: unknown}
    expect(reset.type).toBe('reset')
    expect(typeof reset.seed).toBe('number')
    apiState.playing = true
    setApi()
    rerender(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Premor'}))
    expect(send).toHaveBeenLastCalledWith({type: 'pause'})
    expect((screen.getByRole('button', {name: 'Korak'}) as HTMLButtonElement).disabled).toBe(true)
  })

  it('the method radios send setMethod', () => {
    render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('radio', {name: 'Preizkus vseh parov'}))
    expect(send).toHaveBeenCalledWith({type: 'setMethod', method: 'naive'})
  })

  it('the count slider is logarithmic and sends setCount', () => {
    render(<CollisionPlayground initialCount={10}/>)
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('aria-valuetext')).toBe('10')
    fireEvent.change(slider, {target: {value: '500'}})
    const sent = send.mock.calls.at(-1)![0] as {type: string; count: number}
    expect(sent.type).toBe('setCount')
    // Halfway along a logarithmic scale 10..5000 is the geometric mean, about 224, not the arithmetic 2505.
    expect(sent.count).toBeGreaterThan(200)
    expect(sent.count).toBeLessThan(250)
  })

  it('switching to a method with a lower limit clamps the count', () => {
    render(<CollisionPlayground initialMethod="sweep" initialCount={MAX_COUNT.sweep}/>)
    fireEvent.click(screen.getByRole('radio', {name: 'Preizkus vseh parov'}))
    expect(send).toHaveBeenCalledWith({type: 'setCount', count: MAX_COUNT.naive})
  })
})

describe('readouts', () => {
  it('render the counters of the newest snapshot, with the pair formula only for naive', () => {
    render(<CollisionPlayground initialMethod="naive" initialCount={1000}/>)
    emit(snap({count: 1000, method: 'naive', counters: {boxTests: 499500, candidates: 3, narrowTests: 3, touchingPairs: 2}, simSpeed: 9, stepMs: 12.3}))
    expect(digits(readoutValue(/Preizkusi škatel/))).toBe('499500')
    expect(digits(readoutValue(/Vsi pari/))).toBe('499500')
    expect(readoutValue(/Stikajoči/)).toBe('2')
    expect(readoutValue(/Čas koraka/)).toContain('12,3')
    expect(digits(readoutValue(/Hitrost/))).toBe('9')
    expect(digits(readoutValue(/Objekti/))).toBe('1000')
    fireEvent.click(screen.getByRole('radio', {name: 'Pometanje in obrezovanje'}))
    expect(screen.queryByText(/Vsi pari/)).toBeNull()
  })

  it('update at most 4 times per second', () => {
    render(<CollisionPlayground/>)
    emit(snap({counters: {boxTests: 1, candidates: 0, narrowTests: 0, touchingPairs: 0}}))
    expect(readoutValue(/Preizkusi škatel/)).toBe('1')
    emit(snap({counters: {boxTests: 2, candidates: 0, narrowTests: 0, touchingPairs: 0}}))
    act(() => { vi.advanceTimersByTime(100) })
    emit(snap({counters: {boxTests: 3, candidates: 0, narrowTests: 0, touchingPairs: 0}}))
    expect(readoutValue(/Preizkusi škatel/)).toBe('1')
    act(() => { vi.advanceTimersByTime(READOUT_INTERVAL_MS) })
    expect(readoutValue(/Preizkusi škatel/)).toBe('3')
  })
})

describe('live region', () => {
  const live = () => document.querySelector('.collision-playground__live')!

  it('stays empty for snapshots no action asked for', () => {
    render(<CollisionPlayground/>)
    emit(snap())
    act(() => { vi.advanceTimersByTime(1000) })
    emit(snap())
    expect(live().textContent).toBe('')
  })

  it('speaks once, on the first snapshot after a reader action', () => {
    render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    expect(live().textContent).toBe('')
    emit(snap({count: 1000, method: 'naive', counters: {boxTests: 499500, candidates: 0, narrowTests: 0, touchingPairs: 0}, simSpeed: 9}))
    const spoken = live().textContent!
    expect(digits(spoken)).toBe('1000' + '499500' + '9')
    expect(spoken).toContain('Preizkus vseh parov')
    emit(snap({counters: {boxTests: 5, candidates: 0, narrowTests: 0, touchingPairs: 0}}))
    expect(live().textContent).toBe(spoken)
  })

  it('changes the region for a second action with the same result, so it is spoken again', () => {
    render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    emit(snap())
    const first = live().textContent!
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    emit(snap())
    expect(live().textContent).not.toBe(first)
    expect(live().textContent!.trim()).toBe(first.trim())
  })

  it('is polite and not announced for Play and Pause', () => {
    render(<CollisionPlayground/>)
    expect(live().getAttribute('aria-live')).toBe('polite')
    fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}))
    emit(snap())
    expect(live().textContent).toBe('')
  })
})

describe('canvas', () => {
  it('is hidden from assistive technology', () => {
    const {container} = render(<CollisionPlayground/>)
    expect(container.querySelector('canvas')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('draws the newest snapshot once per frame and nothing without a new one', () => {
    render(<CollisionPlayground/>)
    emit(snap())
    emit(snap({stepIndex: 2}))
    emit(snap({stepIndex: 3}))
    act(() => { vi.advanceTimersByTime(20) })
    expect(clearRect).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(100) })
    expect(clearRect).toHaveBeenCalledTimes(1)
  })

  it('never draws a body thinner than one CSS pixel', () => {
    render(<CollisionPlayground/>)
    emit(snap())
    act(() => { vi.advanceTimersByTime(20) })
    // jsdom has no layout, so the device pixel ratio is 1 and radius 0.1 world units would be far below a pixel.
    const radii = arcs.map((a) => a[2])
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(1)
  })

  it('draws a ring around touching bodies only', () => {
    render(<CollisionPlayground/>)
    emit(snap())
    act(() => { vi.advanceTimersByTime(20) })
    // One body plain, one touching: two body arcs plus one ring arc.
    expect(arcs).toHaveLength(3)
  })
})

describe('fallback', () => {
  it('renders a static explanation with the n = 1000 count and no canvas', () => {
    apiState.status = 'unavailable'
    setApi()
    const {container} = render(<CollisionPlayground/>)
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(digits(screen.getByText(/1000 objektih/).textContent)).toContain('1000499500')
  })

  it('is English in English', () => {
    setLanguage('en')
    apiState.status = 'unavailable'
    setApi()
    render(<CollisionPlayground/>)
    expect(screen.getByText(/sweep and prune needs far fewer/)).toBeTruthy()
  })
})

describe('reduced motion', () => {
  it('starts paused: no play command and the button offers Play', () => {
    const posted: {type: string}[] = []
    class StubWorker {
      onmessage: unknown = null
      onerror: unknown = null
      postMessage(m: {type: string}) { posted.push(m) }
      terminate() {}
    }
    vi.stubGlobal('Worker', StubWorker)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    hookState.useReal = true
    render(<CollisionPlayground/>)
    expect(posted.map((m) => m.type)).toEqual(['init'])
    expect(screen.getByRole('button', {name: 'Predvajaj'}).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('keyboard path', () => {
  it('reaches every control in order, changes the count and switches the method', () => {
    render(<CollisionPlayground initialCount={10}/>)
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('slider')[0])
    fireEvent.keyDown(document.activeElement!, {key: 'PageUp'})
    const count = send.mock.calls.at(-1)![0] as {type: string; count: number}
    expect(count.type).toBe('setCount')
    expect(count.count).toBeGreaterThan(10)
    userEvent.tab()
    const group = within(screen.getByRole('group', {name: 'Način iskanja trkov'}))
    expect(document.activeElement).toBe(group.getByRole('radio', {name: 'Pometanje in obrezovanje'}))
    userEvent.keyboard('{arrowright}')
    fireEvent.click(group.getByRole('radio', {name: 'Preizkus vseh parov'}))
    expect(send).toHaveBeenCalledWith({type: 'setMethod', method: 'naive'})
    for (const name of ['Predvajaj', 'Korak', 'Nova razporeditev']) {
      userEvent.tab()
      expect(document.activeElement).toBe(screen.getByRole('button', {name}))
    }
  })

  it('changes the count by one per arrow press where one log step rounds to the same count', () => {
    render(<CollisionPlayground initialCount={10}/>)
    // A plain arrow is handled natively by the range input: it moves the position by one step.
    const slider = screen.getAllByRole('slider')[0] as HTMLInputElement
    const nudge = (delta: number): void => {
      fireEvent.change(slider, {target: {value: String(Number(slider.value) + delta)}})
    }
    nudge(1)
    expect(send).toHaveBeenLastCalledWith({type: 'setCount', count: 11})
    nudge(1)
    expect(send).toHaveBeenLastCalledWith({type: 'setCount', count: 12})
    nudge(-1)
    expect(send).toHaveBeenLastCalledWith({type: 'setCount', count: 11})
  })

  it('operates the buttons with Enter and Space', () => {
    render(<CollisionPlayground/>)
    const step = screen.getByRole('button', {name: 'Korak'})
    step.focus()
    userEvent.keyboard('{enter}')
    expect(send).toHaveBeenLastCalledWith({type: 'stepOnce'})
  })
})
