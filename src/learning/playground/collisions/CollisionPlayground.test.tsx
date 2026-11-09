import {act, cleanup, fireEvent, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {setLanguage} from '../../../localization'
import CollisionPlayground, {READOUT_INTERVAL_MS} from './CollisionPlayground'
import {POLYGON_TEMPLATES} from '../../../compgeo/collisions/polygonTemplates'
import {WORLD_WIDTH} from '../../../compgeo/collisions/world'
import {MAX_COUNT} from './collisionProtocol'
import {spriteGeometry} from './polygonSprites'
import type {CollisionSnapshot} from './collisionProtocol'
import {createWorkerLoop} from './collisionLoop'
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
    shape: 'circle',
    seed: 1,
    positions: new Float32Array([100, 100, 800, 500]),
    radii: new Float32Array([20, 0.1]),
    templates: new Uint8Array(0),
    scale: 0,
    touching: new Uint8Array([1, 0]),
    counters: {boxTests: 7, candidates: 1, narrowTests: 1, touchingPairs: 1, hullTests: 0, hullPasses: 0, pieceTests: 0},
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
    const step = screen.getByRole('button', {name: 'Korak'})
    expect(step.getAttribute('aria-disabled')).toBe('true')
    expect(step.hasAttribute('disabled')).toBe(false)
    expect(step.getAttribute('title')).toBe('Med predvajanjem korak ni na voljo. Najprej pritisni Premor.')
    send.mockClear()
    fireEvent.click(step)
    expect(send).not.toHaveBeenCalled()
    expect(document.querySelector('[data-playback-reason="playing"]')).not.toBeNull()
  })

  it('the method radios send setMethod', () => {
    render(<CollisionPlayground/>)
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'naive'}})
    expect(send).toHaveBeenCalledWith({type: 'setMethod', method: 'naive'})
  })

  it('the count slider is logarithmic and sends setCount', () => {
    render(<CollisionPlayground initialCount={10}/>)
    const slider = screen.getAllByRole('slider')[0]
    expect(slider.getAttribute('aria-valuetext')).toBe('10')
    fireEvent.change(slider, {target: {value: '500'}})
    const sent = send.mock.calls.at(-1)![0] as {type: string; count: number}
    expect(sent.type).toBe('setCount')
    // Halfway along a logarithmic scale 10..5000 is the geometric mean, about 224, not the arithmetic 2505.
    expect(sent.count).toBeGreaterThan(200)
    expect(sent.count).toBeLessThan(250)
  })

  it('switching to a method with a lower limit clamps the count', () => {
    render(<CollisionPlayground initialMethod="sweep" initialCount={MAX_COUNT.circle.sweep}/>)
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'naive'}})
    expect(send).toHaveBeenCalledWith({type: 'setCount', count: MAX_COUNT.circle.naive})
  })
})

describe('paused method switch with the real worker loop', () => {
  it('announces the new method and updates the readout without Step or Play', () => {
    const loop = createWorkerLoop((event) => { if (event.type === 'snapshot') emit(event) }, () => () => {})
    send.mockImplementation((command) => loop.handle(command))
    render(<CollisionPlayground initialMethod="naive" initialCount={200}/>)
    loop.handle({type: 'init', seed: 1, count: 200, method: 'naive', playing: false})
    loop.handle({type: 'stepOnce'})
    act(() => { vi.advanceTimersByTime(1000) })
    expect(digits(readoutValue(/Preizkusi pravokotnikov/))).toBe('19900')
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'sweep'}})
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('Pometanje in obrezovanje')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(Number(digits(readoutValue(/Preizkusi pravokotnikov/)))).toBeLessThan(19900)
  })
})

describe('count slider output', () => {
  it('shows the count at first render, not a rounded-trip neighbour', () => {
    render(<CollisionPlayground/>)
    expect(screen.getAllByRole('slider')[0].getAttribute('aria-valuetext')).toBe('300')
  })
})

describe('readouts', () => {
  it('render the counters of the newest snapshot, with the pair formula only for naive', () => {
    render(<CollisionPlayground initialMethod="naive" initialCount={1000}/>)
    emit(snap({count: 1000, method: 'naive', counters: {boxTests: 499500, candidates: 3, narrowTests: 3, touchingPairs: 2, hullTests: 0, hullPasses: 0, pieceTests: 0}, simSpeed: 9, stepMs: 12.3}))
    expect(digits(readoutValue(/Preizkusi pravokotnikov/))).toBe('499500')
    expect(digits(readoutValue(/Vsi pari/))).toBe('499500')
    expect(readoutValue(/Stikajoči/)).toBe('2')
    expect(readoutValue(/Čas koraka/)).toContain('12,3')
    expect(digits(readoutValue(/Hitrost/))).toBe('9')
    expect(digits(readoutValue(/Objekti/))).toBe('1000')
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'sweep'}})
    expect(screen.queryByText(/Vsi pari/)).toBeNull()
  })

  it('update at most 4 times per second', () => {
    render(<CollisionPlayground/>)
    emit(snap({counters: {boxTests: 1, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0}}))
    expect(readoutValue(/Preizkusi pravokotnikov/)).toBe('1')
    emit(snap({counters: {boxTests: 2, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0}}))
    act(() => { vi.advanceTimersByTime(100) })
    emit(snap({counters: {boxTests: 3, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0}}))
    expect(readoutValue(/Preizkusi pravokotnikov/)).toBe('1')
    act(() => { vi.advanceTimersByTime(READOUT_INTERVAL_MS) })
    expect(readoutValue(/Preizkusi pravokotnikov/)).toBe('3')
  })
})

describe('live region', () => {
  const live = () => document.querySelector('[data-readout-live]')!

  it('stays empty for snapshots no action asked for', () => {
    render(<CollisionPlayground/>)
    emit(snap())
    act(() => { vi.advanceTimersByTime(1000) })
    emit(snap())
    expect(live().textContent).toBe('')
  })

  it('pauses a running playground before a count, method, coverage or New arrangement edit, but not before bounce or the stage (decision 57)', () => {
    apiState.playing = true
    setApi()
    render(<CollisionPlayground shape="polygon"/>)
    const lastTwo = () => send.mock.calls.slice(-2).map((call) => (call[0] as {type: string}).type)
    fireEvent.click(screen.getByRole('button', {name: 'Nova razporeditev'}))
    expect(lastTwo()).toEqual(['pause', 'reset'])
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'naive'}})
    expect(send.mock.calls.map((call) => (call[0] as {type: string}).type).slice(-3)).toContain('pause')
    send.mockClear()
    fireEvent.click(screen.getByRole('checkbox', {name: 'Odboji med objekti'}))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenLastCalledWith({type: 'setBounce', bounce: true})
  })

  it('sends pause on an edit even when React playing still reads false (the worker echo lags)', () => {
    apiState.playing = false
    setApi()
    render(<CollisionPlayground shape="polygon"/>)
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'naive'}})
    expect(send.mock.calls.map((call) => (call[0] as {type: string}).type)).toContain('pause')
  })

  it('speaks once, on the first snapshot after a reader action', () => {
    render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    expect(live().textContent).toBe('')
    emit(snap({count: 1000, method: 'naive', counters: {boxTests: 499500, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0}, simSpeed: 9}))
    const spoken = live().textContent!
    expect(digits(spoken)).toBe('1000' + '499500' + '9')
    expect(spoken).toContain('Preizkus vseh parov')
    emit(snap({counters: {boxTests: 5, candidates: 0, narrowTests: 0, touchingPairs: 0, hullTests: 0, hullPasses: 0, pieceTests: 0}}))
    expect(live().textContent).toBe(spoken)
  })

  it('keeps the same text for a second action with the same result (the shared live region does not repeat it)', () => {
    render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    emit(snap())
    const first = live().textContent!
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    emit(snap())
    expect(live().textContent).toBe(first)
  })

  it('is muted while a run plays and shows the current text again on pause', () => {
    const {rerender} = render(<CollisionPlayground/>)
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    apiState.playing = true
    setApi()
    rerender(<CollisionPlayground/>)
    emit(snap())
    expect(live().textContent).toBe('')
    apiState.playing = false
    setApi()
    rerender(<CollisionPlayground/>)
    expect(live().textContent).toContain('preizkusov')
  })

  it('skips an in-flight snapshot of the old method after a method action, then speaks the new one', () => {
    render(<CollisionPlayground initialMethod="naive" initialCount={2}/>)
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'sweep'}})
    emit(snap({method: 'naive', count: 2}))
    expect(live().textContent).toBe('')
    emit(snap({method: 'sweep', count: 2}))
    expect(live().textContent).toContain('Pometanje in obrezovanje')
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
    expect(screen.getByRole('button', {name: 'Predvajaj'}).getAttribute('data-playing')).toBe('false')
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
    expect(document.activeElement).toBe(screen.getAllByRole('slider')[1])
    fireEvent.keyDown(document.activeElement!, {key: 'PageUp'})
    // Coverage 1.25 % (5 quarter percents) plus one big step of 4 quarter percents.
    expect(send).toHaveBeenLastCalledWith({type: 'setCoverage', areaFraction: 9 / 400})
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('combobox', {name: 'Način iskanja trkov'}))
    fireEvent.change(screen.getByRole('combobox', {name: 'Način iskanja trkov'}), {target: {value: 'naive'}})
    expect(send).toHaveBeenCalledWith({type: 'setMethod', method: 'naive'})
    userEvent.tab()
    const bounce = screen.getByRole('checkbox', {name: 'Odboji med objekti'})
    expect(document.activeElement).toBe(bounce)
    fireEvent.click(bounce)
    expect(send).toHaveBeenLastCalledWith({type: 'setBounce', bounce: true})
    for (const name of ['Korak', 'Predvajaj', 'Nova razporeditev']) {
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

describe('polygon mode', () => {
  const polyCounters = {boxTests: 300, candidates: 20, narrowTests: 20, touchingPairs: 9, hullTests: 20, hullPasses: 12, pieceTests: 31}
  const polySnap = (over: Partial<CollisionSnapshot> = {}): CollisionSnapshot =>
    snap({
      count: 100,
      shape: 'polygon',
      positions: new Float32Array(200).map((_, i) => 100 + 7 * i),
      radii: new Float32Array(100).fill(5),
      touching: new Uint8Array(100).map((_, i) => (i < 2 ? 1 : 0)),
      templates: new Uint8Array(100).map((_, i) => i % 7),
      scale: 4,
      counters: polyCounters,
      ...over,
    })

  const stubWorker = (posted: {type: string; shape?: string; overlay?: string}[]): void => {
    class StubWorker {
      onmessage: unknown = null
      onerror: unknown = null
      postMessage(m: {type: string}) { posted.push(m) }
      terminate() {}
    }
    vi.stubGlobal('Worker', StubWorker)
    hookState.useReal = true
  }

  it('asks the worker for a polygon world with the box stage selected', () => {
    const posted: {type: string; shape?: string; overlay?: string}[] = []
    stubWorker(posted)
    render(<CollisionPlayground shape="polygon"/>)
    expect(posted[0]).toMatchObject({type: 'init', shape: 'polygon', overlay: 'boxes'})
  })

  it('a circle component asks for circles', () => {
    const posted: {type: string; shape?: string}[] = []
    stubWorker(posted)
    render(<CollisionPlayground/>)
    expect(posted[0]).toMatchObject({type: 'init', shape: 'circle'})
  })

  it('offers the three stages as a select and sends setOverlay', () => {
    render(<CollisionPlayground shape="polygon"/>)
    const select = screen.getByRole('combobox', {name: 'Prikazana faza'}) as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['boxes', 'hulls', 'pieces'])
    expect(select.value).toBe('boxes')
    fireEvent.change(select, {target: {value: 'hulls'}})
    expect(send).toHaveBeenLastCalledWith({type: 'setOverlay', overlay: 'hulls'})
    fireEvent.change(select, {target: {value: 'pieces'}})
    expect(send).toHaveBeenLastCalledWith({type: 'setOverlay', overlay: 'pieces'})
    expect(select.value).toBe('pieces')
  })

  it('has no stage switch and no removed-pair readouts for circles', () => {
    render(<CollisionPlayground/>)
    emit(snap())
    expect(screen.queryByRole('combobox', {name: 'Prikazana faza'})).toBeNull()
    expect(screen.queryByText(/Pari, ki jih zavrnejo/)).toBeNull()
  })

  it('puts the stage switch in the tab order between the method switch and the buttons', () => {
    render(<CollisionPlayground shape="polygon" initialCount={10}/>)
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('slider')[0])
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('slider')[1])
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('combobox', {name: 'Način iskanja trkov'}))
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('combobox', {name: 'Prikazana faza'}))
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('checkbox', {name: 'Odboji med objekti'}))
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Korak'}))
  })

  it('shows the pairs removed by each stage from the counters, and the hull and piece tests', () => {
    render(<CollisionPlayground shape="polygon" initialMethod="sweep" initialCount={100}/>)
    emit(polySnap())
    // C(100, 2) = 4950 pairs; 20 candidates; 12 pass the hulls; 9 touch.
    expect(digits(readoutValue(/zavrnejo pravokotniki/))).toBe(String(4950 - 20))
    expect(digits(readoutValue(/Preizkusi ovojnic/))).toBe('20')
    expect(digits(readoutValue(/zavrnejo ovojnice/))).toBe(String(20 - 12))
    expect(digits(readoutValue(/Preizkusi delov/))).toBe('31')
    expect(digits(readoutValue(/zavrnejo deli/))).toBe(String(12 - 9))
  })

  it('speaks only after a reader action, and the stage switch is not an announced action', () => {
    render(<CollisionPlayground shape="polygon"/>)
    const live = document.querySelector('[data-readout-live]')!
    emit(polySnap())
    expect(live.textContent).toBe('')
    fireEvent.change(screen.getByRole('combobox', {name: 'Prikazana faza'}), {target: {value: 'hulls'}})
    emit(polySnap())
    expect(live.textContent).toBe('')
    fireEvent.click(screen.getByRole('button', {name: 'Korak'}))
    emit(polySnap())
    // Objects, box tests, then the pairs removed by the boxes, hulls and pieces: C(100,2) - 20, 20 - 12, 12 - 9.
    expect(live.textContent).toContain('Pometanje in obrezovanje')
    expect(digits(live.textContent)).toBe('100' + '300' + String(4950 - 20) + '8' + '3')
  })

  it('takes the removed-by-boxes figure from the snapshot count, not the slider', () => {
    render(<CollisionPlayground shape="polygon" initialCount={100}/>)
    emit(polySnap({count: 50}))
    // C(50, 2) = 1225 pairs, 20 candidates; the slider still says 100.
    expect(digits(readoutValue(/zavrnejo pravokotniki/))).toBe(String(1225 - 20))
  })

  it('starts paused under reduced motion', () => {
    const posted: {type: string}[] = []
    stubWorker(posted)
    vi.stubGlobal('matchMedia', (query: string) => ({matches: query.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {}}))
    render(<CollisionPlayground shape="polygon"/>)
    expect(posted.map((m) => m.type)).toEqual(['init'])
    expect(screen.getByRole('button', {name: 'Predvajaj'}).getAttribute('data-playing')).toBe('false')
  })

  it('renders the static explanation when the worker is unavailable', () => {
    apiState.status = 'unavailable'
    setApi()
    const {container} = render(<CollisionPlayground shape="polygon"/>)
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByRole('combobox', {name: 'Prikazana faza'})).toBeNull()
    expect(digits(screen.getByText(/1000 objektih/).textContent)).toContain('1000499500')
  })

  describe('drawing', () => {
    // Polygon bodies are drawn from per-template sprites; one shared recording context sees both the sprite canvases and the main canvas.
    interface Recorded {loops: [number, number][][]; rects: number; width: number; dash: number[]}
    const rec = {
      current: {loops: [], rects: 0} as {loops: [number, number][][]; rects: number},
      strokes: [] as Recorded[],
      fills: 0,
      fillLog: [] as {style: string; alpha: number}[],
      images: [] as [number, number][],
      dash: [] as number[],
    }
    const ctx = {
      clearRect,
      beginPath: () => { rec.current = {loops: [], rects: 0} },
      moveTo: (x: number, y: number) => { rec.current.loops.push([[x, y]]) },
      lineTo: (x: number, y: number) => { rec.current.loops.at(-1)!.push([x, y]) },
      closePath: () => undefined,
      rect: () => { rec.current.rects++ },
      fill: () => { rec.fills++; rec.fillLog.push({style: ctx.fillStyle, alpha: ctx.globalAlpha}) },
      stroke: (path?: unknown) => {
        if (path === undefined) rec.strokes.push({...rec.current, width: ctx.lineWidth, dash: rec.dash})
      },
      setLineDash: (d: number[]) => { rec.dash = d },
      drawImage: (_img: unknown, x: number, y: number) => { rec.images.push([x, y]) },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    }
    beforeEach(() => {
      rec.strokes = []
      rec.fills = 0
      rec.fillLog = []
      rec.images = []
      rec.dash = []
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
    })

    const seven = (): CollisionSnapshot =>
      polySnap({count: 7, positions: new Float32Array(14).fill(500), radii: new Float32Array(7).fill(5), touching: new Uint8Array(7), templates: new Uint8Array([0, 1, 2, 3, 4, 5, 6])})
    const frame = (): void => { act(() => { vi.advanceTimersByTime(40) }) }
    const clear = (): void => { rec.strokes = []; rec.fills = 0; rec.fillLog = []; rec.images = [] }
    const drawStage = (name: string | null): void => {
      render(<CollisionPlayground shape="polygon"/>)
      if (name) fireEvent.change(screen.getByRole('combobox', {name: 'Prikazana faza'}), {target: {value: name}})
      frame()
      clear()
      emit(seven())
      frame()
    }

    it('draws one dashed box per template in the box stage and one sprite per body', () => {
      drawStage(null)
      expect(rec.strokes).toHaveLength(7)
      expect(rec.strokes.every((st) => st.rects === 1 && st.loops.length === 0)).toBe(true)
      expect(rec.strokes[0].dash).toEqual([6, 4])
      expect(rec.images).toHaveLength(7)
    })

    it('rasterises each template once and reuses the sprites on the next frame', () => {
      drawStage(null)
      clear()
      emit(seven())
      frame()
      expect(rec.strokes).toHaveLength(0)
      expect(rec.fills).toBe(0)
      expect(rec.images).toHaveLength(7)
    })

    it('draws the hull of each template, dotted, in the hull stage', () => {
      drawStage('hulls')
      expect(rec.strokes).toHaveLength(7)
      rec.strokes.forEach((st, i) => {
        expect(st.rects).toBe(0)
        expect(st.loops).toHaveLength(1)
        expect(st.loops[0]).toHaveLength(POLYGON_TEMPLATES[i].hull.size)
      })
      expect(rec.strokes[0].dash).toEqual([2, 4])
      // The outline stroke is two CSS pixels wide, so the dots read as dots (the test devicePixelRatio is 1).
      expect(rec.strokes[0].width).toBe(2)
    })

    it('draws the exact hull outline of a known template and places its sprite at the scaled body position', () => {
      const {container} = render(<CollisionPlayground shape="polygon"/>)
      fireEvent.change(screen.getByRole('combobox', {name: 'Prikazana faza'}), {target: {value: 'hulls'}})
      frame()
      clear()
      emit(polySnap({count: 1, positions: new Float32Array([500, 300]), radii: new Float32Array([5]), touching: new Uint8Array(1), templates: new Uint8Array([2]), scale: 4}))
      frame()
      const shape = POLYGON_TEMPLATES[2]
      const k = container.querySelector('canvas')!.width / WORLD_WIDTH
      const unit = 4 * k
      const g = spriteGeometry(shape.hx, shape.hy, unit, 1, 'hulls')
      const drawn = rec.strokes[0].loops[0]
      expect(drawn).toHaveLength(shape.hull.size)
      drawn.forEach(([px, py], v) => {
        expect(px).toBeCloseTo(g.cx + unit * shape.hull.px[v], 6)
        expect(py).toBeCloseTo(g.cy + unit * shape.hull.py[v], 6)
      })
      expect(rec.images).toHaveLength(1)
      rec.images.forEach(([x, y]) => {
        expect(x).toBe(Math.round(500 * k - g.cx))
        expect(y).toBe(Math.round(300 * k - g.cy))
      })
    })

    it('draws a touching body from the hit sprite and a plain one from the plain sprite', () => {
      render(<CollisionPlayground shape="polygon"/>)
      frame()
      clear()
      emit(polySnap({count: 2, positions: new Float32Array([300, 300, 600, 300]), radii: new Float32Array([5, 5]), touching: new Uint8Array([1, 0]), templates: new Uint8Array([0, 0])}))
      frame()
      // Sprites are rendered in body order: the touching body first, at full alpha in the touching colour, then the plain one.
      expect(rec.fillLog).toHaveLength(2)
      expect(rec.fillLog[0].alpha).toBe(1)
      expect(rec.fillLog[1].alpha).toBe(0.85)
      expect(rec.fillLog[0].style).not.toBe(rec.fillLog[1].style)
      expect(rec.images).toHaveLength(2)
    })

    it('rebuilds the sprites in a remounted playground instead of reusing the old instance cache', () => {
      drawStage(null)
      expect(rec.fills).toBe(7)
      cleanup()
      snapshotRef.current = null // the mocked hook keeps the last snapshot; a real remount starts empty
      clear()
      drawStage(null)
      expect(rec.fills).toBe(7)
    })

    it('keeps every template vertex, hull and piece vertex inside its half extents', () => {
      for (const shape of POLYGON_TEMPLATES) {
        for (const v of shape.vertices) {
          expect(Math.abs(v.x)).toBeLessThanOrEqual(shape.hx)
          expect(Math.abs(v.y)).toBeLessThanOrEqual(shape.hy)
        }
        for (const part of [shape.hull, ...shape.pieces]) {
          for (let v = 0; v < part.size; v++) {
            expect(Math.abs(part.px[v])).toBeLessThanOrEqual(shape.hx)
            expect(Math.abs(part.py[v])).toBeLessThanOrEqual(shape.hy)
          }
        }
      }
    })

    it('draws every convex piece, solid, in the piece stage', () => {
      drawStage('pieces')
      expect(rec.strokes).toHaveLength(7)
      const pieces = POLYGON_TEMPLATES.reduce((sum, shape) => sum + shape.pieces.length, 0)
      expect(rec.strokes.reduce((sum, st) => sum + st.loops.length, 0)).toBe(pieces)
      expect(rec.strokes[0].dash).toEqual([])
    })
  })
})
