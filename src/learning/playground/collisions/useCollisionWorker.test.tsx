import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {IDLE_PAUSE_MS, useCollisionWorker} from './useCollisionWorker'
import type {CollisionSnapshot} from './collisionProtocol'

class MockWorker {
  static instances: MockWorker[] = []
  static throwOnConstruct = false
  messages: {type: string}[] = []
  terminated = false
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  constructor() {
    if (MockWorker.throwOnConstruct) throw new Error('no workers')
    MockWorker.instances.push(this)
  }
  postMessage(message: {type: string}) {
    this.messages.push(message)
  }
  terminate() {
    this.terminated = true
  }
  get types() {
    return this.messages.map((m) => m.type)
  }
}

class MockObserver {
  static instances: MockObserver[] = []
  disconnected = false
  observed: Element[] = []
  constructor(public callback: (entries: {isIntersecting: boolean}[]) => void) {
    MockObserver.instances.push(this)
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  disconnect() {
    this.disconnected = true
  }
}

let hidden = false
let reduced = false

function setHidden(value: boolean) {
  hidden = value
  document.dispatchEvent(new Event('visibilitychange'))
}

const initial = {seed: 1, count: 20, method: 'naive'} as const

function mount() {
  const target = document.createElement('div')
  const targetRef = {current: target}
  const view = renderHook(() => useCollisionWorker({initial, targetRef}))
  const worker = MockWorker.instances[0]
  const observer = MockObserver.instances[0]
  // The first observer callback reports the canvas as visible.
  if (observer) act(() => observer.callback([{isIntersecting: true}]))
  return {...view, worker, observer}
}

beforeEach(() => {
  MockWorker.instances = []
  MockWorker.throwOnConstruct = false
  MockObserver.instances = []
  hidden = false
  reduced = false
  vi.stubGlobal('Worker', MockWorker)
  vi.stubGlobal('IntersectionObserver', MockObserver)
  vi.stubGlobal('matchMedia', (query: string) => ({matches: reduced && query.includes('reduce')}))
  Object.defineProperty(document, 'hidden', {configurable: true, get: () => hidden})
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'hidden')
})

describe('useCollisionWorker', () => {
  it('inits the worker paused and plays once the canvas is reported visible', () => {
    const {worker, result} = mount()
    expect(worker.messages[0]).toMatchObject({type: 'init', seed: 1, count: 20, method: 'naive', playing: false})
    expect(worker.types).toEqual(['init', 'play'])
    expect(result.current.playing).toBe(true)
    expect(result.current.status).toBe('ready')
  })

  it('terminates the worker on unmount', () => {
    const {worker, unmount} = mount()
    expect(worker.terminated).toBe(false)
    unmount()
    expect(worker.terminated).toBe(true)
  })

  it('pauses when the document is hidden and resumes when visible again', () => {
    const {worker, result} = mount()
    act(() => setHidden(true))
    expect(worker.types.at(-1)).toBe('pause')
    expect(result.current.playing).toBe(false)
    act(() => setHidden(false))
    expect(worker.types.at(-1)).toBe('play')
  })

  it('pauses when the canvas leaves the viewport and resumes when it returns', () => {
    const {worker, observer} = mount()
    act(() => observer.callback([{isIntersecting: false}]))
    expect(worker.types.at(-1)).toBe('pause')
    act(() => observer.callback([{isIntersecting: true}]))
    expect(worker.types.at(-1)).toBe('play')
  })

  it('pauses after the idle timeout and does not resume by itself', () => {
    const {worker, result} = mount()
    act(() => {
      vi.advanceTimersByTime(IDLE_PAUSE_MS - 1)
    })
    expect(worker.types.at(-1)).toBe('play')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(worker.types.at(-1)).toBe('pause')
    expect(result.current.playing).toBe(false)
    act(() => setHidden(true))
    act(() => setHidden(false))
    expect(worker.types.at(-1)).toBe('pause')
    act(() => result.current.send({type: 'play'}))
    expect(worker.types.at(-1)).toBe('play')
  })

  it('treats any command as a reader action that restarts the idle timer', () => {
    const {worker, result} = mount()
    act(() => {
      vi.advanceTimersByTime(IDLE_PAUSE_MS - 1000)
    })
    act(() => result.current.send({type: 'setCount', count: 50}))
    expect(worker.messages.at(-1)).toMatchObject({type: 'setCount', count: 50})
    act(() => {
      vi.advanceTimersByTime(IDLE_PAUSE_MS - 1000)
    })
    expect(worker.types.at(-1)).toBe('setCount')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(worker.types.at(-1)).toBe('pause')
  })

  it('starts paused under reduced motion until the reader presses play', () => {
    reduced = true
    const {worker, result} = mount()
    expect(worker.types).toEqual(['init'])
    expect(result.current.playing).toBe(false)
    act(() => result.current.send({type: 'stepOnce'}))
    expect(worker.types.at(-1)).toBe('stepOnce')
    act(() => result.current.send({type: 'play'}))
    expect(worker.types.at(-1)).toBe('play')
    expect(result.current.playing).toBe(true)
  })

  it('reports unavailable and installs nothing when the constructor throws', async () => {
    MockWorker.throwOnConstruct = true
    const add = vi.spyOn(document, 'addEventListener')
    const {result} = mount()
    await act(async () => {})
    expect(result.current.status).toBe('unavailable')
    expect(add).not.toHaveBeenCalledWith('visibilitychange', expect.anything())
    expect(MockObserver.instances).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    act(() => result.current.send({type: 'play'}))
  })

  it('reports unavailable and terminates when the worker errors', () => {
    const {worker, result} = mount()
    act(() => worker.onerror?.())
    expect(result.current.status).toBe('unavailable')
    expect(worker.terminated).toBe(true)
  })

  it('reports unavailable when the worker posts an error event', () => {
    const {worker, result} = mount()
    act(() => worker.onmessage?.({data: {type: 'error', message: 'boom'}} as MessageEvent))
    expect(result.current.status).toBe('unavailable')
    expect(worker.terminated).toBe(true)
  })

  it('leaves no listener, observer or timer after unmount', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const {unmount, observer} = mount()
    const handler = add.mock.calls.find((c) => c[0] === 'visibilitychange')?.[1]
    expect(handler).toBeDefined()
    unmount()
    expect(remove).toHaveBeenCalledWith('visibilitychange', handler)
    expect(observer.disconnected).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('exposes snapshots through a ref and subscription without re-rendering', () => {
    const target = document.createElement('div')
    let renders = 0
    const targetRef = {current: target}
    const {result} = renderHook(() => {
      renders++
      return useCollisionWorker({initial, targetRef})
    })
    const worker = MockWorker.instances[0]
    const listener = vi.fn()
    const unsubscribe = result.current.subscribe(listener)
    const rendersBefore = renders
    const snapshot = {type: 'snapshot', stepIndex: 3} as CollisionSnapshot
    act(() => {
      for (let i = 0; i < 5; i++) worker.onmessage?.({data: snapshot} as MessageEvent)
    })
    expect(result.current.snapshotRef.current).toBe(snapshot)
    expect(listener).toHaveBeenCalledTimes(5)
    expect(renders).toBe(rendersBefore)
    unsubscribe()
    act(() => worker.onmessage?.({data: snapshot} as MessageEvent))
    expect(listener).toHaveBeenCalledTimes(5)
  })
})
