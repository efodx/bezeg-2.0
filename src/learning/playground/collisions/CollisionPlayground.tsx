import {useEffect, useRef, useState} from 'react'
import type {ChangeEvent} from 'react'
import {currentLanguage, useT} from '../../../localization'
import Slider from '../../../inputs/Slider'
import {WORLD_HEIGHT, WORLD_WIDTH} from '../../../compgeo/collisions/world'
import {clampCount, MAX_COUNT} from './collisionProtocol'
import type {BroadPhaseMethod, CollisionSnapshot} from './collisionProtocol'
import {useCollisionWorker} from './useCollisionWorker'
import './CollisionPlayground.css'

/** The shortest time between readout updates (ms): at most 4 updates per second. */
export const READOUT_INTERVAL_MS = 250
const COUNT_FLOOR = 10
const SLIDER_STEPS = 1000
/** Bodies are never drawn thinner than this many CSS pixels. */
const MIN_DRAWN_RADIUS = 1

interface CollisionPlaygroundProps {
  initialCount?: number
  initialMethod?: BroadPhaseMethod
  initialSeed?: number
}

interface Readout {
  count: number
  boxTests: number
  touchingPairs: number
  stepMs: number
  simSpeed: number
  clampedFrom: number | null
}

interface Colours {
  body: string
  touching: string
}

const toReadout = (s: CollisionSnapshot): Readout => ({
  count: s.count,
  boxTests: s.counters.boxTests,
  touchingPairs: s.counters.touchingPairs,
  stepMs: s.stepMs,
  simSpeed: s.simSpeed,
  clampedFrom: s.clampedFrom,
})

/** Logarithmic slider position (0..SLIDER_STEPS) of a count, and back. */
const toPosition = (count: number, method: BroadPhaseMethod): number =>
  Math.round((SLIDER_STEPS * Math.log(Math.max(COUNT_FLOOR, count) / COUNT_FLOOR)) / Math.log(MAX_COUNT[method] / COUNT_FLOOR))
const toCount = (position: number, method: BroadPhaseMethod): number =>
  clampCount(Math.round(COUNT_FLOOR * Math.pow(MAX_COUNT[method] / COUNT_FLOOR, position / SLIDER_STEPS)), method)

const locale = (): string => (currentLanguage() === 'sl' ? 'sl-SI' : 'en-US')
const formatInt = (value: number): string => new Intl.NumberFormat(locale(), {maximumFractionDigits: 0}).format(Math.round(value))
const formatOne = (value: number): string => new Intl.NumberFormat(locale(), {maximumFractionDigits: 1}).format(value)

/** Reads the palette from CSS custom properties once on mount, never per frame. The app has no dark theme yet. */
function readColours(el: Element): Colours {
  const style = getComputedStyle(el)
  return {
    body: style.getPropertyValue('--collision-body').trim() || '#587445',
    touching: style.getPropertyValue('--collision-touching').trim() || '#bf8542',
  }
}

/** Draws one snapshot: plain bodies in one fill path, touching bodies in a second path plus a ring path. */
function drawSnapshot(canvas: HTMLCanvasElement, s: CollisionSnapshot, colours: Colours): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width)
  const scale = canvas.width / WORLD_WIDTH
  const minR = MIN_DRAWN_RADIUS * dpr
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const plain = new Path2D()
  const hit = new Path2D()
  const rings = new Path2D()
  for (let i = 0; i < s.count; i++) {
    const x = s.positions[2 * i] * scale
    const y = s.positions[2 * i + 1] * scale
    const r = Math.max(minR, s.radii[i] * scale)
    const touching = s.touching[i] === 1
    const path = touching ? hit : plain
    path.moveTo(x + r, y)
    path.arc(x, y, r, 0, 2 * Math.PI)
    if (touching) {
      const ring = r + 2 * dpr
      rings.moveTo(x + ring, y)
      rings.arc(x, y, ring, 0, 2 * Math.PI)
    }
  }
  ctx.fillStyle = colours.body
  ctx.globalAlpha = 0.85
  ctx.fill(plain)
  ctx.globalAlpha = 1
  ctx.fillStyle = colours.touching
  ctx.fill(hit)
  ctx.strokeStyle = colours.touching
  ctx.lineWidth = 1.5 * dpr
  ctx.stroke(rings)
}

export default function CollisionPlayground({initialCount = 300, initialMethod = 'sweep', initialSeed = 1}: CollisionPlaygroundProps) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [count, setCount] = useState(() => clampCount(initialCount, initialMethod))
  const [method, setMethod] = useState<BroadPhaseMethod>(initialMethod)
  const [readout, setReadout] = useState<Readout | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const {status, playing, snapshotRef, subscribe, send} = useCollisionWorker({
    initial: {seed: initialSeed, count: clampCount(initialCount, initialMethod), method: initialMethod},
    targetRef: canvasRef,
  })
  const pendingAnnounce = useRef(false)
  const announceToggle = useRef(false)
  const coloursRef = useRef<Colours>({body: '#587445', touching: '#bf8542'})
  const rafRef = useRef(0)

  // Declared after the hook call: the hook's dispose clears its subscribers, so a later effect subscribes afresh.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || status !== 'ready') return undefined
    const refit = (): void => {
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round((canvas.clientWidth || 640) * dpr))
      const height = Math.round((width * WORLD_HEIGHT) / WORLD_WIDTH)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }
    // The draw loop: one requestAnimationFrame per burst of snapshots, drawing only the newest one.
    const frame = (): void => {
      rafRef.current = 0
      const s = snapshotRef.current
      if (!s) return
      drawSnapshot(canvas, s, coloursRef.current)
    }
    const request = (): void => {
      if (rafRef.current === 0) rafRef.current = requestAnimationFrame(frame)
    }
    const redraw = request
    refit()
    coloursRef.current = readColours(canvas)

    // Throttle: a leading update when 250 ms have passed, otherwise one trailing update.
    let lastReadout = -Infinity
    let trailing: ReturnType<typeof setTimeout> | undefined
    const publish = (): void => {
      trailing = undefined
      const s = snapshotRef.current
      if (!s) return
      lastReadout = performance.now()
      setReadout(toReadout(s))
    }
    const unsubscribe = subscribe(() => {
      request()
      const s = snapshotRef.current
      if (s && pendingAnnounce.current) {
        // The live region: one message, for the first snapshot after a reader action.
        pendingAnnounce.current = false
        // Alternate a trailing no-break space so an identical message after a second action still changes the region.
        announceToggle.current = !announceToggle.current
        setAnnouncement(
          t('collision_announce', {
            value0: formatInt(s.count),
            value1: t(s.method === 'naive' ? 'collision_method_naive' : 'collision_method_sweep'),
            value2: formatInt(s.counters.boxTests),
            value3: formatInt(s.simSpeed),
          }) + (announceToggle.current ? String.fromCharCode(0xa0) : ''),
        )
      }
      const wait = READOUT_INTERVAL_MS - (performance.now() - lastReadout)
      if (wait <= 0) {
        clearTimeout(trailing)
        publish()
      } else if (trailing === undefined) {
        trailing = setTimeout(publish, wait)
      }
    })

    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            refit()
            redraw()
          })
        : null
    observer?.observe(canvas)
    if (snapshotRef.current) {
      publish()
      redraw()
    }
    return () => {
      unsubscribe()
      clearTimeout(trailing)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      observer?.disconnect()
    }
  }, [status, snapshotRef, subscribe, t])

  const onCount = (position: number): void => {
    // At low counts one log step rounds to the same integer, so step the count itself by one in the slider's direction.
    const direction = Math.sign(position - toPosition(count, method))
    let next = toCount(position, method)
    if (direction > 0 && next <= count) next = clampCount(count + 1, method)
    if (direction < 0 && next >= count) next = clampCount(count - 1, method)
    if (next === count) return
    pendingAnnounce.current = true
    setCount(next)
    send({type: 'setCount', count: next})
  }
  const onMethod = (e: ChangeEvent<HTMLInputElement>): void => {
    const next: BroadPhaseMethod = e.target.value === 'naive' ? 'naive' : 'sweep'
    pendingAnnounce.current = true
    setMethod(next)
    send({type: 'setMethod', method: next})
    const clamped = clampCount(count, next)
    if (clamped !== count) {
      setCount(clamped)
      send({type: 'setCount', count: clamped})
    }
  }

  if (status === 'unavailable') {
    return (
      <section className="collision-playground collision-playground--unavailable" aria-label={t('collision_region')}>
        <h3>{t('collision_unavailable_title')}</h3>
        <p>{t('collision_unavailable', {value0: formatInt((1000 * 999) / 2)})}</p>
      </section>
    )
  }

  const limit = MAX_COUNT[method]
  return (
    <section className="collision-playground" aria-label={t('collision_region')}>
      <canvas ref={canvasRef} className="collision-playground__canvas" aria-hidden="true" width={640} height={400}/>
      <div className="collision-playground__controls">
        <Slider min={0} max={SLIDER_STEPS} step={1} bigStep={100} value={toPosition(count, method)}
                customText={t('collision_count')} formatValue={(p) => formatInt(toCount(p, method))} onChange={onCount}/>
        {readout?.clampedFrom != null && <p className="collision-playground__note">{t('collision_limit', {value0: formatInt(limit)})}</p>}
        <fieldset className="collision-playground__methods">
          <legend>{t('collision_methods')}</legend>
          {(['naive', 'sweep'] as const).map((m) => (
            <label key={m} className="collision-playground__choice">
              <input type="radio" name="collision-method" value={m} checked={method === m} onChange={onMethod}/>
              <span>{t(m === 'naive' ? 'collision_method_naive' : 'collision_method_sweep')}</span>
            </label>
          ))}
        </fieldset>
        <div className="collision-playground__buttons">
          <button type="button" aria-pressed={playing} onClick={() => send({type: playing ? 'pause' : 'play'})}>
            {t(playing ? 'collision_pause' : 'collision_play')}
          </button>
          <button type="button" disabled={playing} onClick={() => { pendingAnnounce.current = true; send({type: 'stepOnce'}) }}>
            {t('collision_step')}
          </button>
          <button type="button" onClick={() => { pendingAnnounce.current = true; send({type: 'reset', seed: Math.floor(Math.random() * 2 ** 31)}) }}>
            {t('collision_new')}
          </button>
        </div>
      </div>
      <dl className="collision-playground__readouts" aria-label={t('collision_readouts')}>
        <div><dt>{t('collision_objects')}</dt><dd>{readout ? formatInt(readout.count) : '—'}</dd></div>
        <div><dt>{t('collision_box_tests')}</dt><dd>{readout ? formatInt(readout.boxTests) : '—'}</dd></div>
        {method === 'naive' && (
          <div><dt>{t('collision_all_pairs')}</dt><dd>{formatInt((count * (count - 1)) / 2)}</dd></div>
        )}
        <div><dt>{t('collision_touching')}</dt><dd>{readout ? formatInt(readout.touchingPairs) : '—'}</dd></div>
        <div><dt>{t('collision_step_time')}</dt><dd>{readout ? t('collision_ms', {value0: formatOne(readout.stepMs)}) : '—'}</dd></div>
        <div><dt>{t('collision_speed')}</dt><dd>{readout ? t('collision_percent', {value0: formatInt(readout.simSpeed)}) : '—'}</dd></div>
      </dl>
      <div className="collision-playground__live" role="status" aria-live="polite">{announcement}</div>
    </section>
  )
}
