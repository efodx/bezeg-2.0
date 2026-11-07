import {act, cleanup, fireEvent, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {setLanguage} from '../../../localization'
import {traceSweep} from '../../../compgeo/collisions/sweepTrace'
import {createScratch, createWorld, stepWorld} from '../../../compgeo/collisions/world'
import CollisionInspect from './CollisionInspect'

/** The trace the component should show: the same fresh world, one sorting step, then the sweep. */
function expected(count: number, seed: number) {
  const world = createWorld({seed, count})
  const scratch = createScratch(count)
  stepWorld(world, 'sweep', scratch)
  return traceSweep(world, scratch.sweep.order)
}

const next = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement
const prev = () => screen.getByRole('button', {name: 'Prejšnji korak'}) as HTMLButtonElement
const live = () => screen.getByTestId('inspect-live')
const eventText = () => screen.getByTestId('inspect-event').textContent ?? ''
const clean = (s: string | null) => (s ?? '').replace(/ /g, '')

let frames: FrameRequestCallback[]
let now: number

beforeEach(() => {
  setLanguage('sl')
  frames = []
  now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => { frames = [] })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function runFrames(ms: number): void {
  act(() => {
    now += ms
    const batch = frames
    frames = []
    batch.forEach(cb => cb(now))
  })
}

describe('step-through', () => {
  it('starts paused at event 0 with 20 bodies, one interval row each and no sweep line', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    expect(document.querySelectorAll('circle[data-body]').length).toBe(20)
    expect(document.querySelectorAll('g[data-row]').length).toBe(20)
    expect(screen.queryByTestId('inspect-sweep')).toBeNull()
    expect(eventText()).toContain(`Dogodek 0 od ${t.events.length}`)
    expect(prev().disabled).toBe(true)
    expect(next().disabled).toBe(false)
    expect(screen.getByRole('button', {name: 'Predvajaj gibanje'}).getAttribute('aria-pressed')).toBe('false')
  })

  it('applies one event per Next and undoes it with Previous; the buttons are disabled at the ends', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    fireEvent.click(next())
    // Event 1 is the first body entering the empty list.
    expect(eventText()).toContain(`Dogodek 1 od ${t.events.length}`)
    expect(eventText()).toContain(`Vstop objekta ${t.events[0].body + 1}`)
    expect(screen.getByTestId('inspect-active').children.length).toBe(1)
    expect(prev().disabled).toBe(false)
    fireEvent.click(prev())
    expect(eventText()).toContain('Dogodek 0 od')
    expect(screen.queryByTestId('inspect-active')).toBeNull()
    for (let k = 0; k < t.events.length; k++) fireEvent.click(next())
    expect(next().disabled).toBe(true)
    expect(eventText()).toContain(`Konec pometanja: ${t.candidates.length} kandidatnih parov, ${t.boxTests} preizkusov pravokotnikov.`)
  })

  it('draws every decided pair at the end: passing pairs solid, y-rejected pairs dashed', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    for (let k = 0; k < t.events.length; k++) fireEvent.click(next())
    const pass = document.querySelectorAll('line[data-kind="pass"]')
    const reject = document.querySelectorAll('line[data-kind="reject"]')
    expect(pass.length).toBe(t.candidates.length)
    expect(reject.length).toBe(t.boxTests - t.candidates.length)
    expect(reject.length).toBeGreaterThan(0)
    pass.forEach(l => expect(l.getAttribute('stroke-dasharray')).toBeNull())
    reject.forEach(l => expect(l.getAttribute('stroke-dasharray')).toBeTruthy())
  })

  it('shows the box-test count so far against n choose 2, and the complexity comparison', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    expect(screen.getByTestId('inspect-caption').textContent).toContain('0 od 190 možnih parov')
    for (let k = 0; k < t.events.length; k++) fireEvent.click(next())
    const caption = screen.getByTestId('inspect-caption').textContent ?? ''
    expect(caption).toContain(`${t.boxTests} od 190 možnih parov`)
    expect(caption).toContain('O(n²)')
    expect(caption).toContain('O(n log n + k)')
  })

  it('places the sweep line at the sweep x of the current event', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    fireEvent.click(next())
    const x1 = Number(screen.getByTestId('inspect-sweep').getAttribute('x1'))
    for (let k = 1; k < t.events.length; k++) fireEvent.click(next())
    const x2 = Number(screen.getByTestId('inspect-sweep').getAttribute('x1'))
    expect(x2).toBeGreaterThan(x1)
  })

  it('lists open intervals as a labelled list that follows leave events', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    const firstLeave = t.events.findIndex(e => e.kind === 'leave')
    expect(firstLeave).toBeGreaterThan(0)
    let applied = 0
    let open = 0
    while (applied <= firstLeave || open === 0) {
      const e = t.events[applied++]
      open += e.kind === 'enter' ? 1 : e.kind === 'leave' ? -1 : 0
      fireEvent.click(next())
    }
    const list = screen.getByRole('list', {name: 'Stanje (intervali, ki še niso odstranjeni)'})
    expect(list.children.length).toBe(open)
    expect(list.textContent).not.toContain(`Objekt ${t.events[firstLeave].body + 1}:`)
  })
})

describe('count and new arrangement', () => {
  it('changes the count by one per arrow step and restarts the step-through', () => {
    render(<CollisionInspect/>)
    fireEvent.click(next())
    const slider = screen.getByRole("slider") as HTMLInputElement
    expect(slider.min).toBe('5')
    expect(slider.max).toBe('40')
    expect(slider.step).toBe('1')
    fireEvent.change(slider, {target: {value: '21'}})
    expect(document.querySelectorAll('circle[data-body]').length).toBe(21)
    expect(eventText()).toContain('Dogodek 0 od')
    fireEvent.change(slider, {target: {value: '20'}})
    expect(document.querySelectorAll('circle[data-body]').length).toBe(20)
  })

  it('draws a different arrangement for New arrangement', () => {
    render(<CollisionInspect/>)
    const before = document.querySelector('circle[data-body="1"]')!.getAttribute('cx')
    fireEvent.click(next())
    fireEvent.click(screen.getByRole('button', {name: 'Nova razporeditev'}))
    expect(document.querySelector('circle[data-body="1"]')!.getAttribute('cx')).not.toBe(before)
    expect(eventText()).toContain('Dogodek 0 od')
  })
})

describe('Play', () => {
  it('moves the bodies with the overlays on, disables stepping, and Pause keeps the full trace', () => {
    render(<CollisionInspect/>)
    const x0 = document.querySelector('circle[data-body="1"]')!.getAttribute('cx')
    const play = screen.getByRole('button', {name: 'Predvajaj gibanje'})
    fireEvent.click(play)
    expect(screen.getByRole('button', {name: 'Ustavi gibanje'}).getAttribute('aria-pressed')).toBe('true')
    expect(next().disabled).toBe(true)
    expect(prev().disabled).toBe(true)
    runFrames(500)
    expect(document.querySelector('circle[data-body="1"]')!.getAttribute('cx')).not.toBe(x0)
    expect(document.querySelectorAll('line[data-kind]').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', {name: 'Ustavi gibanje'}))
    expect(next().disabled).toBe(true)
    expect(prev().disabled).toBe(false)
    expect(eventText()).toContain('Konec pometanja')
  })
})

describe('live region', () => {
  it('is polite and speaks once per step-through action with the current event in words', () => {
    const t = expected(20, 1)
    render(<CollisionInspect/>)
    expect(live().getAttribute('aria-live')).toBe('polite')
    expect(live().textContent).toBe('')
    fireEvent.click(next())
    expect(clean(live().textContent)).toBe(`Vstop objekta ${t.events[0].body + 1} pri x = ${Math.round(t.events[0].x)}`)
    const spoken = live().textContent
    // A re-render without an action does not change the region.
    fireEvent.change(screen.getAllByRole('spinbutton')[0], {target: {value: '20'}})
    fireEvent.click(prev())
    expect(clean(live().textContent)).toBe('Začetek: pometalna premica je levo od vseh intervalov.')
    expect(live().textContent).not.toBe(spoken)
  })

  it('does not speak while the motion plays frame by frame', () => {
    render(<CollisionInspect/>)
    fireEvent.click(screen.getByRole('button', {name: 'Predvajaj gibanje'}))
    const spoken = live().textContent
    runFrames(100)
    runFrames(100)
    expect(live().textContent).toBe(spoken)
  })

  it('repeats an identical message audibly by alternating a no-break space', () => {
    render(<CollisionInspect/>)
    fireEvent.click(screen.getByRole('button', {name: 'Nova razporeditev'}))
    const a = live().textContent
    fireEvent.click(screen.getByRole('button', {name: 'Nova razporeditev'}))
    expect(live().textContent).not.toBe(a)
    expect(clean(live().textContent)).toBe(clean(a))
  })
})

describe('keyboard path', () => {
  it('reaches the count slider and then Next, Play and New in order, and Enter steps', () => {
    render(<CollisionInspect/>)
    userEvent.tab()
    // The number field comes first in the slider, then the range; Previous is disabled and skipped.
    expect(document.activeElement).toBe(screen.getByRole('spinbutton'))
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('slider'))
    userEvent.tab()
    expect(document.activeElement).toBe(next())
    const handler = vi.fn()
    next().addEventListener('click', handler)
    act(() => { userEvent.keyboard('{enter}') })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(eventText()).toContain('Dogodek 1 od')
    expect(prev().disabled).toBe(false)
  })

  it('tabs from Next to Play to New when Previous is disabled', () => {
    render(<CollisionInspect/>)
    next().focus()
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Predvajaj gibanje'}))
    userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Nova razporeditev'}))
  })
})
