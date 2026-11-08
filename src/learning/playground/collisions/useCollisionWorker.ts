import {useCallback, useEffect, useRef, useState} from 'react'
import type {RefObject} from 'react'
import type {BroadPhaseMethod, CollisionCommand, CollisionEvent, CollisionOverlay, CollisionSnapshot, WorldShape} from './collisionProtocol'

/** The worker pauses after this long without a reader action. */
export const IDLE_PAUSE_MS = 120_000

export type CollisionWorkerStatus = 'ready' | 'unavailable'

export interface CollisionWorkerOptions {
  /** Read once, on mount. */
  initial: {seed: number; count: number; method: BroadPhaseMethod; shape?: WorldShape; overlay?: CollisionOverlay}
  /** The canvas (or its wrapper): the worker pauses while it is out of view. */
  targetRef: RefObject<Element | null>
}

export interface CollisionWorkerApi {
  status: CollisionWorkerStatus
  /** True while the worker is running steps; false when paused by the reader, the page, the viewport or idleness. */
  playing: boolean
  /** The newest snapshot. Changes without a React render: read it in an animation frame or a subscription. */
  snapshotRef: RefObject<CollisionSnapshot | null>
  /** Calls `listener` after every snapshot. Returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void
  /** Sends a reader command. Any command counts as a reader action and restarts the idle timer. */
  send: (command: Exclude<CollisionCommand, {type: 'init'}>) => void
}

export function useCollisionWorker({initial, targetRef}: CollisionWorkerOptions): CollisionWorkerApi {
  const [status, setStatus] = useState<CollisionWorkerStatus>('ready')
  const [playing, setPlaying] = useState(false)
  const snapshotRef = useRef<CollisionSnapshot | null>(null)
  const listeners = useRef(new Set<() => void>())
  const sender = useRef<((command: Exclude<CollisionCommand, {type: 'init'}>) => void) | null>(null)
  const initialRef = useRef(initial)

  useEffect(() => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./collisionWorker.ts', import.meta.url), {type: 'module'})
    } catch {
      // Deferred: React's rules forbid a synchronous state update in an effect body.
      queueMicrotask(() => setStatus('unavailable'))
      return undefined
    }

    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let wantPlay = !reducedMotion
    let hidden = document.hidden
    const hasObserver = typeof IntersectionObserver === 'function' && targetRef.current !== null
    let inView = !hasObserver
    let running = false
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const sync = (): void => {
      const should = wantPlay && !hidden && inView
      if (should === running) return
      running = should
      worker.postMessage({type: should ? 'play' : 'pause'} satisfies CollisionCommand)
      setPlaying(should)
    }
    const restartIdleTimer = (): void => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        // An idle pause is a reader pause: only Play resumes it.
        wantPlay = false
        sync()
      }, IDLE_PAUSE_MS)
    }
    const onVisibility = (): void => {
      hidden = document.hidden
      sync()
    }
    const observer = hasObserver
      ? new IntersectionObserver(
          (entries) => {
            const latest = entries[entries.length - 1]
            if (!latest) return
            inView = latest.isIntersecting
            sync()
          },
          {threshold: 0},
        )
      : null

    const dispose = (): void => {
      if (disposed) return
      disposed = true
      clearTimeout(idleTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      observer?.disconnect()
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
      sender.current = null
      listeners.current.clear()
    }
    const fail = (): void => {
      dispose()
      setStatus('unavailable')
      setPlaying(false)
    }

    worker.onmessage = (event: MessageEvent<CollisionEvent>) => {
      const data = event.data
      if (data.type === 'error') {
        fail()
        return
      }
      snapshotRef.current = data
      listeners.current.forEach((listener) => listener())
    }
    worker.onerror = fail

    sender.current = (command) => {
      restartIdleTimer()
      if (command.type === 'play') wantPlay = true
      if (command.type === 'pause') wantPlay = false
      if (command.type === 'play' || command.type === 'pause') {
        sync()
        return
      }
      worker.postMessage(command)
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (observer && targetRef.current) observer.observe(targetRef.current)
    worker.postMessage({type: 'init', ...initialRef.current, playing: false} satisfies CollisionCommand)
    restartIdleTimer()
    sync()

    return dispose
  }, [targetRef])

  const send = useCallback((command: Exclude<CollisionCommand, {type: 'init'}>) => sender.current?.(command), [])
  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  return {status, playing, snapshotRef, subscribe, send}
}
