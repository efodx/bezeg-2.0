import {useEffect, useRef, useState} from 'react'
import type {ChangeEvent} from 'react'
import {currentLanguage, useT} from '../../../localization'
import Slider from '../../../inputs/Slider'
import {WORLD_HEIGHT, WORLD_WIDTH} from '../../../compgeo/collisions/world'
import {POLYGON_TEMPLATES} from '../../../compgeo/collisions/polygonTemplates'
import {clampCount, MAX_COUNT} from './collisionProtocol'
import type {BroadPhaseMethod, CollisionOverlay, CollisionSnapshot, WorldShape} from './collisionProtocol'
import {useCollisionWorker} from './useCollisionWorker'
import {createDrawPacer} from './drawPacing'
import {createPolygonSpriteCache, renderSpriteToCanvas, STAGE_DASH, STAGE_WIDTH} from './polygonSprites'
import {makePlacement, place} from '../../../compgeo/collisions/rotation'
import type {PolygonSpriteCache, SpriteParams} from './polygonSprites'
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
  /** 'polygon' runs the batch C world: polygon bodies, hull and convex-piece stages, and the overlay switch. */
  shape?: WorldShape
}

interface Readout {
  count: number
  boxTests: number
  touchingPairs: number
  stepMs: number
  simSpeed: number
  clampedFrom: number | null
  candidates: number
  hullTests: number
  hullPasses: number
  pieceTests: number
}

interface Colours {
  body: string
  touching: string
  outline: string
}

/** The polygon overlay stages, in pipeline order. */
const STAGES = ['boxes', 'hulls', 'pieces'] as const
type Stage = (typeof STAGES)[number]
const STAGE_LABEL = {boxes: 'collision_overlay_boxes', hulls: 'collision_overlay_hulls', pieces: 'collision_overlay_pieces'} as const

const toReadout = (s: CollisionSnapshot): Readout => ({
  count: s.count,
  boxTests: s.counters.boxTests,
  touchingPairs: s.counters.touchingPairs,
  stepMs: s.stepMs,
  simSpeed: s.simSpeed,
  clampedFrom: s.clampedFrom,
  candidates: s.counters.candidates,
  hullTests: s.counters.hullTests,
  hullPasses: s.counters.hullPasses,
  pieceTests: s.counters.pieceTests,
})

/** Logarithmic slider position (0..SLIDER_STEPS) of a count, and back. */
const toPosition = (count: number, method: BroadPhaseMethod, shape: WorldShape): number =>
  Math.round((SLIDER_STEPS * Math.log(Math.max(COUNT_FLOOR, count) / COUNT_FLOOR)) / Math.log(MAX_COUNT[shape][method] / COUNT_FLOOR))
const toCount = (position: number, method: BroadPhaseMethod, shape: WorldShape): number =>
  clampCount(Math.round(COUNT_FLOOR * Math.pow(MAX_COUNT[shape][method] / COUNT_FLOOR, position / SLIDER_STEPS)), method, shape)

const locale = (): string => (currentLanguage() === 'sl' ? 'sl-SI' : 'en-US')
const formatCoverage = (value: number): string => new Intl.NumberFormat(locale(), {maximumFractionDigits: 2}).format(value)
const formatInt = (value: number): string => new Intl.NumberFormat(locale(), {maximumFractionDigits: 0}).format(Math.round(value))
const formatOne = (value: number): string => new Intl.NumberFormat(locale(), {maximumFractionDigits: 1}).format(value)

/** Reads the palette from CSS custom properties once on mount, never per frame. The app has no dark theme yet. */
function readColours(el: Element): Colours {
  const style = getComputedStyle(el)
  return {
    body: style.getPropertyValue('--collision-body').trim() || '#587445',
    touching: style.getPropertyValue('--collision-touching').trim() || '#bf8542',
    outline: style.getPropertyValue('--collision-outline').trim() || '#33402b',
  }
}

/** Draws one snapshot: plain bodies in one fill path, touching bodies in a second path plus a ring path. */
function drawSnapshot(canvas: HTMLCanvasElement, s: CollisionSnapshot, colours: Colours, stage: Stage, sprites: PolygonSpriteCache): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (s.shape === 'polygon') {
    drawPolygons(canvas, ctx, s, colours, stage, sprites)
    return
  }
  const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width)
  const scale = canvas.width / WORLD_WIDTH
  const minR = MIN_DRAWN_RADIUS * dpr
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const plain = new Path2D()
  const hit = new Path2D()
  const rings = new Path2D()
  const spokes = s.angles ? new Path2D() : null
  for (let i = 0; i < s.count; i++) {
    const x = s.positions[2 * i] * scale
    const y = s.positions[2 * i + 1] * scale
    const r = Math.max(minR, s.radii[i] * scale)
    const touching = s.touching[i] === 1
    const path = touching ? hit : plain
    path.moveTo(x + r, y)
    path.arc(x, y, r, 0, 2 * Math.PI)
    if (spokes && s.angles) {
      spokes.moveTo(x, y)
      spokes.lineTo(x + r * Math.cos(s.angles[i]), y + r * Math.sin(s.angles[i]))
    }
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
  if (spokes) {
    ctx.strokeStyle = colours.outline
    ctx.lineWidth = 1 * dpr
    ctx.stroke(spokes)
  }
}

/**
 * Draws a polygon snapshot from per-template sprites (fill and stage outline in one image) and a ring path round
 * every touching body. Each template is rasterised once per (unit, dpr, stage, colours) in the component-owned
 * sprite cache; a body costs one drawImage at a whole-pixel position, so the frame cost no longer grows with vertex counts.
 */
function drawPolygons(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, s: CollisionSnapshot, colours: Colours, stage: Stage, cache: PolygonSpriteCache): void {
  const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width)
  const k = canvas.width / WORLD_WIDTH
  const unit = s.scale * k
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false // whole-pixel blits: no resampling
  const params: SpriteParams = {unit, dpr, stage, body: colours.body, touching: colours.touching, outline: colours.outline}
  // Per-frame allocations are O(1): this params object and one rings path, nothing per body.
  const rings = new Path2D()
  const boxes = new Path2D()
  const placement = makePlacement()
  for (let i = 0; i < s.count; i++) {
    const shape = POLYGON_TEMPLATES[s.templates[i]]
    if (!shape) continue
    const touching = s.touching[i] === 1
    const x = s.positions[2 * i] * k
    const y = s.positions[2 * i + 1] * k
    const angle = s.angles ? s.angles[i] : 0
    let sx: number
    let sy: number
    let ring = unit * Math.hypot(shape.hx, shape.hy) + 2 * dpr
    if (angle === 0) {
      const sprite = cache.get(s.templates[i], touching ? 'hit' : 'plain', params)
      const left = Math.round(x - sprite.cx)
      const top = Math.round(y - sprite.cy)
      ctx.drawImage(sprite.image, left, top)
      // Centred on the snapped sprite centre (cx, cy are whole pixels), so ring and body share a centre.
      sx = left + sprite.cx
      sy = top + sprite.cy
    } else {
      // Rotated body: the sprite is drawn turned about the template origin, which sits at the box centre minus the
      // rotated box's centre offset (rotation.ts). The box stage draws the current axis-aligned box instead of the sprite's.
      place(placement, shape, 0, 0, angle, 1)
      const sprite = cache.get(s.templates[i], touching ? (stage === 'boxes' ? 'hitFill' : 'hit') : (stage === 'boxes' ? 'plainFill' : 'plain'), params)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.translate(x - unit * placement.bbx, y - unit * placement.bby)
      ctx.rotate(angle)
      ctx.drawImage(sprite.image, -sprite.cx, -sprite.cy)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      sx = x
      sy = y
      if (stage === 'boxes') boxes.rect(x - unit * placement.hx, y - unit * placement.hy, 2 * unit * placement.hx, 2 * unit * placement.hy)
      ring = unit * Math.hypot(placement.hx, placement.hy) + 2 * dpr
    }
    if (touching) {
      rings.moveTo(sx + ring, sy)
      rings.arc(sx, sy, ring, 0, 2 * Math.PI)
    }
  }
  if (s.angles && stage === 'boxes') {
    ctx.strokeStyle = colours.outline
    ctx.lineWidth = STAGE_WIDTH.boxes * dpr
    ctx.setLineDash(STAGE_DASH.boxes.map((d) => d * dpr))
    ctx.stroke(boxes)
    ctx.setLineDash([])
  }
  ctx.strokeStyle = colours.touching
  ctx.lineWidth = 1.5 * dpr
  ctx.stroke(rings)
}

export default function CollisionPlayground({initialCount = 300, initialMethod = 'sweep', initialSeed = 1, shape = 'circle'}: CollisionPlaygroundProps) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [count, setCount] = useState(() => clampCount(initialCount, initialMethod, shape))
  const [method, setMethod] = useState<BroadPhaseMethod>(initialMethod)
  const [stage, setStage] = useState<Stage>('boxes')
  const [bounce, setBounce] = useState(false)
  // Coverage in quarter percent: 5 = 1.25 % (AREA_FRACTION).
  const [coverage, setCoverage] = useState(5)
  const stageRef = useRef<Stage>('boxes')
  const redrawRef = useRef<() => void>(() => undefined)
  const [readout, setReadout] = useState<Readout | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const {status, playing, snapshotRef, subscribe, send} = useCollisionWorker({
    initial: {
      seed: initialSeed,
      count: clampCount(initialCount, initialMethod, shape),
      method: initialMethod,
      shape,
      overlay: shape === 'polygon' ? 'boxes' : undefined,
    },
    targetRef: canvasRef,
  })
  /** Set by a reader action; method and count, when given, are what the first announced snapshot must show. */
  const pendingAnnounce = useRef<{method?: BroadPhaseMethod; count?: number} | null>(null)
  const announceToggle = useRef(false)
  const coloursRef = useRef<Colours>({body: '#587445', touching: '#bf8542', outline: '#33402b'})
  const [sprites] = useState(() => createPolygonSpriteCache(renderSpriteToCanvas))
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
    // Under main-thread load the pacer skips frames; a skipped frame touches nothing and asks for the next one.
    const pacer = createDrawPacer()
    const frame = (now: number): void => {
      rafRef.current = 0
      const s = snapshotRef.current
      if (!s) return
      if (!pacer.shouldDraw(now)) {
        request()
        return
      }
      drawSnapshot(canvas, s, coloursRef.current, stageRef.current, sprites)
    }
    function request(): void {
      if (rafRef.current === 0) rafRef.current = requestAnimationFrame(frame)
    }
    const redraw = request
    redrawRef.current = request
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
      const want = pendingAnnounce.current
      // A snapshot already in flight from before a method or count action is skipped, not announced.
      if (s && want && (want.method === undefined || want.method === s.method) && (want.count === undefined || want.count === s.count)) {
        // The live region: one message, for the first snapshot after a reader action.
        pendingAnnounce.current = null
        // Alternate a trailing no-break space so an identical message after a second action still changes the region.
        announceToggle.current = !announceToggle.current
        const method = t(s.method === 'naive' ? 'collision_method_naive' : 'collision_method_sweep')
        const spoken =
          s.shape === 'polygon'
            ? t('collision_announce_polygons', {
                value0: formatInt(s.count),
                value1: method,
                value2: formatInt(s.counters.boxTests),
                value3: formatInt((s.count * (s.count - 1)) / 2 - s.counters.candidates),
                value4: formatInt(s.counters.candidates - s.counters.hullPasses),
                value5: formatInt(s.counters.hullPasses - s.counters.touchingPairs),
              })
            : t('collision_announce', {
                value0: formatInt(s.count),
                value1: method,
                value2: formatInt(s.counters.boxTests),
                value3: formatInt(s.simSpeed),
              })
        setAnnouncement(spoken + (announceToggle.current ? String.fromCharCode(0xa0) : ''))
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
      redrawRef.current = () => undefined
      sprites.reset()
    }
  }, [status, snapshotRef, subscribe, t, sprites])

  const onCount = (position: number): void => {
    // At low counts one log step rounds to the same integer, so step the count itself by one in the slider's direction.
    const direction = Math.sign(position - toPosition(count, method, shape))
    let next = toCount(position, method, shape)
    if (direction > 0 && next <= count) next = clampCount(count + 1, method, shape)
    if (direction < 0 && next >= count) next = clampCount(count - 1, method, shape)
    if (next === count) return
    pendingAnnounce.current = {count: next}
    setCount(next)
    send({type: 'setCount', count: next})
  }
  const onMethod = (e: ChangeEvent<HTMLInputElement>): void => {
    const next: BroadPhaseMethod = e.target.value === 'naive' ? 'naive' : 'sweep'
    const clamped = clampCount(count, next, shape)
    pendingAnnounce.current = {method: next, count: clamped}
    setMethod(next)
    send({type: 'setMethod', method: next})
    if (clamped !== count) {
      setCount(clamped)
      send({type: 'setCount', count: clamped})
    }
  }

  const onStage = (e: ChangeEvent<HTMLInputElement>): void => {
    const next: Stage = STAGES.find((candidate) => candidate === e.target.value) ?? 'boxes'
    stageRef.current = next
    setStage(next)
    send({type: 'setOverlay', overlay: next satisfies CollisionOverlay})
    redrawRef.current()
  }

  if (status === 'unavailable') {
    return (
      <section className="collision-playground collision-playground--unavailable" aria-label={t('collision_region')}>
        <h3>{t('collision_unavailable_title')}</h3>
        <p>{t('collision_unavailable', {value0: formatInt((1000 * 999) / 2)})}</p>
      </section>
    )
  }

  const limit = MAX_COUNT[shape][method]
  const polygons = shape === 'polygon'
  const pairsOf = (n: number): number => (n * (n - 1)) / 2
  return (
    <section className="collision-playground" aria-label={t('collision_region')}>
      <canvas ref={canvasRef} className="collision-playground__canvas" aria-hidden="true" width={640} height={400}/>
      <div className="collision-playground__controls">
        <Slider min={0} max={SLIDER_STEPS} step={1} bigStep={100} value={toPosition(count, method, shape)}
                customText={t('collision_count')} formatValue={(p) => formatInt(p === toPosition(count, method, shape) ? count : toCount(p, method, shape))} onChange={onCount}/>
        <Slider min={1} max={120} step={1} bigStep={4} value={coverage}
                customText={t('collision_coverage')} formatValue={(p) => t('collision_percent', {value0: formatCoverage(p / 4)})}
                onChange={(p) => { setCoverage(p); pendingAnnounce.current = {}; send({type: 'setCoverage', areaFraction: p / 400}) }}/>
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
        {polygons && (
          <fieldset className="collision-playground__methods">
            <legend>{t('collision_overlay')}</legend>
            {STAGES.map((st) => (
              <label key={st} className="collision-playground__choice">
                <input type="radio" name="collision-overlay" value={st} checked={stage === st} onChange={onStage}/>
                <span>{t(STAGE_LABEL[st])}</span>
              </label>
            ))}
            <p className="collision-playground__note">{t('collision_overlay_legend')}</p>
          </fieldset>
        )}
        <label className="collision-playground__choice">
          <input type="checkbox" checked={bounce} onChange={(event) => {
            setBounce(event.target.checked)
            send({type: 'setBounce', bounce: event.target.checked})
          }}/>
          <span>{t('collision_bounce')}</span>
        </label>
        <div className="collision-playground__buttons">
          <button type="button" aria-pressed={playing} onClick={() => send({type: playing ? 'pause' : 'play'})}>
            {t(playing ? 'collision_pause' : 'collision_play')}
          </button>
          <button type="button" disabled={playing} onClick={() => { pendingAnnounce.current = {}; send({type: 'stepOnce'}) }}>
            {t('collision_step')}
          </button>
          <button type="button" onClick={() => { pendingAnnounce.current = {}; send({type: 'reset', seed: Math.floor(Math.random() * 2 ** 31)}) }}>
            {t('collision_new')}
          </button>
        </div>
      </div>
      <dl className="collision-playground__readouts" aria-label={t('collision_readouts')}>
        <div><dt>{t('collision_objects')}</dt><dd>{readout ? formatInt(readout.count) : '—'}</dd></div>
        <div><dt>{t('collision_box_tests')}</dt><dd>{readout ? formatInt(readout.boxTests) : '—'}</dd></div>
        {method === 'naive' && (
          <div><dt>{t('collision_all_pairs')}</dt><dd>{formatInt(pairsOf(count))}</dd></div>
        )}
        {polygons && (
          <>
            <div><dt>{t('collision_removed_boxes')}</dt><dd>{readout ? formatInt(pairsOf(readout.count) - readout.candidates) : '—'}</dd></div>
            <div><dt>{t('collision_hull_tests')}</dt><dd>{readout ? formatInt(readout.hullTests) : '—'}</dd></div>
            <div><dt>{t('collision_removed_hulls')}</dt><dd>{readout ? formatInt(readout.candidates - readout.hullPasses) : '—'}</dd></div>
            <div><dt>{t('collision_piece_tests')}</dt><dd>{readout ? formatInt(readout.pieceTests) : '—'}</dd></div>
            <div><dt>{t('collision_removed_pieces')}</dt><dd>{readout ? formatInt(readout.hullPasses - readout.touchingPairs) : '—'}</dd></div>
          </>
        )}
        <div><dt>{t('collision_touching')}</dt><dd>{readout ? formatInt(readout.touchingPairs) : '—'}</dd></div>
        <div><dt>{t('collision_step_time')}</dt><dd>{readout ? t('collision_ms', {value0: formatOne(readout.stepMs)}) : '—'}</dd></div>
        <div><dt>{t('collision_speed')}</dt><dd>{readout ? t('collision_percent', {value0: formatInt(readout.simSpeed)}) : '—'}</dd></div>
      </dl>
      <div className="collision-playground__live" role="status" aria-live="polite">{announcement}</div>
    </section>
  )
}
