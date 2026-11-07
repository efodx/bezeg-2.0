import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {currentLanguage, useT} from '../../../localization'
import Slider from '../../../inputs/Slider'
import {WORLD_HEIGHT, WORLD_WIDTH, createScratch, createWorld, stepWorld} from '../../../compgeo/collisions/world'
import {replaySweep, traceSweep} from '../../../compgeo/collisions/sweepTrace'
import type {SweepEvent} from '../../../compgeo/collisions/sweepTrace'
import './CollisionPlayground.css'
import './CollisionInspect.css'

/*
 * "Look underneath" of the collision playground (spec docs/specs/collision-playground.md, task CP5).
 *
 * Main thread, no worker: CP3 measured one step at n = 100 on the 4x throttled profile at 0.03 ms (naive) and 0.005 ms
 * (sweep) (docs/bezier-performance-results.md, "Collision playground step cost"), far below the 1 ms bar at n <= 40.
 * The trace is recomputed from the live world on every render that needs it; at n <= 40 that is a few hundred events.
 *
 * Drawing: SVG, not canvas. At n <= 40 there are at most a few hundred elements, labels stay real text (legible, selectable,
 * measurable in tests) and dash styles are plain attributes. The SVG viewBox is the measured pixel width, so text is 12 px
 * at every width instead of shrinking with the 1600-unit world.
 */

export const INSPECT_MIN = 5
export const INSPECT_MAX = 40
export const INSPECT_DEFAULT = 20
const ROW_HEIGHT = 16
const GUTTER = 26
const FALLBACK_WIDTH = 640
const TIME_STEP_MS = 1000 / 60
const MAX_STEPS_PER_FRAME = 5
const PASS_DASH: string | undefined = undefined
const REJECT_DASH = '6 4'

const locale = (): string => (currentLanguage() === 'sl' ? 'sl-SI' : 'en-US')
const formatInt = (value: number): string => new Intl.NumberFormat(locale(), {maximumFractionDigits: 0}).format(Math.round(value))

interface Arrangement {
  world: ReturnType<typeof createWorld>
  scratch: ReturnType<typeof createScratch>
}

function arrangement(count: number, seed: number): Arrangement {
  const world = createWorld({seed, count})
  const scratch = createScratch(count)
  // One step sorts the persistent order; the trace then starts from it exactly as the real pass would.
  stepWorld(world, 'sweep', scratch)
  return {world, scratch}
}

function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(FALLBACK_WIDTH)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const measure = (): void => setWidth(Math.max(240, Math.round(el.clientWidth || FALLBACK_WIDTH)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

interface CollisionInspectProps {
  initialCount?: number
  initialSeed?: number
}

export default function CollisionInspect({initialCount = INSPECT_DEFAULT, initialSeed = 1}: CollisionInspectProps) {
  const t = useT()
  const boxRef = useRef<HTMLDivElement>(null)
  const width = useWidth(boxRef)
  const [count, setCount] = useState(() => Math.max(INSPECT_MIN, Math.min(INSPECT_MAX, Math.round(initialCount))))
  const [seed, setSeed] = useState(initialSeed)
  const [version, setVersion] = useState(0)
  const [applied, setApplied] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const announceToggle = useRef(false)

  // The world is mutated in place by Play (`version` re-renders); it is rebuilt only when count or seed change.
  const {world, scratch} = useMemo(() => arrangement(count, seed), [count, seed])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` marks in-place world mutation
  const trace = useMemo(() => traceSweep(world, scratch.sweep.order), [world, scratch, version])
  const shown = playing ? trace.events.length : Math.min(applied, trace.events.length)
  const replay = useMemo(() => replaySweep(trace.events, shown), [trace, shown])

  const describe = useCallback((events: readonly SweepEvent[], at: number, candidates: number, tests: number): string => {
    if (at <= 0) return t('collision_inspect_event_start')
    if (at >= events.length) return t('collision_inspect_event_end', {value0: formatInt(candidates), value1: formatInt(tests)})
    const e = events[at - 1]
    const x = formatInt(e.x)
    switch (e.kind) {
      case 'enter': return t('collision_inspect_event_enter', {value0: formatInt(e.body + 1), value1: x})
      case 'leave': return t('collision_inspect_event_leave', {value0: formatInt(e.body + 1), value1: x})
      case 'box-test': return t('collision_inspect_event_test', {value0: formatInt(e.body + 1), value1: formatInt(e.other + 1)})
      case 'candidate': return t('collision_inspect_event_candidate', {value0: formatInt(e.body + 1), value1: formatInt(e.other + 1)})
      case 'y-rejected': return t('collision_inspect_event_rejected', {value0: formatInt(e.body + 1), value1: formatInt(e.other + 1)})
    }
  }, [t])

  /** The live region speaks once per step-through action; an alternating no-break space keeps repeated text audible. */
  const announce = useCallback((text: string): void => {
    announceToggle.current = !announceToggle.current
    setAnnouncement(text + (announceToggle.current ? String.fromCharCode(0xa0) : ''))
  }, [])

  const goTo = (next: number): void => {
    const at = Math.max(0, Math.min(next, trace.events.length))
    setApplied(at)
    announce(describe(trace.events, at, trace.candidates.length, trace.boxTests))
  }

  const reset = (nextCount: number, nextSeed: number): void => {
    setPlaying(false)
    setApplied(0)
    setCount(nextCount)
    setSeed(nextSeed)
    announce(t('collision_inspect_event_start'))
  }

  // Play: advance the same world in place with a fixed time step; the overlays are drawn for the whole sweep each frame.
  useEffect(() => {
    if (!playing) return undefined
    let raf = 0
    let last = performance.now()
    let acc = 0
    const frame = (now: number): void => {
      acc += now - last
      last = now
      let steps = 0
      while (acc >= TIME_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        stepWorld(world, 'sweep', scratch)
        acc -= TIME_STEP_MS
        steps++
      }
      if (steps === MAX_STEPS_PER_FRAME) acc = 0
      if (steps > 0) setVersion(v => v + 1)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, world, scratch])

  const togglePlay = (): void => {
    if (!playing) {
      setPlaying(true)
      announce(t('collision_inspect_playing'))
    } else {
      setPlaying(false)
      setApplied(trace.events.length)
      announce(describe(trace.events, trace.events.length, trace.candidates.length, trace.boxTests))
    }
  }

  const scale = width / WORLD_WIDTH
  const worldHeight = WORLD_HEIGHT * scale
  const lineTop = 8
  const lineHeight = count * ROW_HEIGHT + 16
  const plotWidth = width - GUTTER - 6
  const px = (x: number): number => GUTTER + (x / WORLD_WIDTH) * plotWidth
  const entered = useMemo(() => {
    const set = new Set<number>()
    for (let k = 0; k < shown; k++) if (trace.events[k].kind === 'enter') set.add(trace.events[k].body)
    return set
  }, [trace, shown])
  const left = useMemo(() => {
    const set = new Set<number>()
    for (let k = 0; k < shown; k++) if (trace.events[k].kind === 'leave') set.add(trace.events[k].body)
    return set
  }, [trace, shown])
  const activeSet = new Set(replay.active)
  const current = replay.current
  const highlighted = new Set<number>()
  if (current) {
    highlighted.add(current.body)
    if (current.other >= 0) highlighted.add(current.other)
  }
  const pairsTotal = (count * (count - 1)) / 2
  const atEnd = shown >= trace.events.length
  const eventText = playing ? t('collision_inspect_playing') : describe(trace.events, shown, trace.candidates.length, trace.boxTests)

  return (
    <section className="collision-playground collision-inspect" aria-label={t('collision_inspect_region')}>
      <h3 className="collision-inspect__title">{t('collision_inspect_region')}</h3>
      <div ref={boxRef} className="collision-inspect__figure">
        <svg className="collision-playground__canvas collision-inspect__world" style={{aspectRatio: 'auto'}} viewBox={`0 0 ${width} ${worldHeight}`}
             width={width} height={worldHeight} role="img" aria-label={t('collision_inspect_world')} data-testid="inspect-world">
          {replay.lines.map(l => (
            <line key={`${l.a}-${l.b}`} className={l.passes ? 'collision-inspect__pass' : 'collision-inspect__reject'}
                  data-pair={`${l.a + 1}-${l.b + 1}`} data-kind={l.passes ? 'pass' : 'reject'}
                  strokeDasharray={l.passes ? PASS_DASH : REJECT_DASH}
                  x1={world.x[l.a] * scale} y1={world.y[l.a] * scale} x2={world.x[l.b] * scale} y2={world.y[l.b] * scale}/>
          ))}
          {Array.from({length: count}, (_, i) => (
            <g key={i}>
              <circle cx={world.x[i] * scale} cy={world.y[i] * scale} r={Math.max(2, world.r[i] * scale)}
                      className={`collision-inspect__body${highlighted.has(i) ? ' is-current' : ''}${activeSet.has(i) ? ' is-active' : ''}`}
                      data-body={i + 1}/>
              {highlighted.has(i) && (
                <text x={world.x[i] * scale + Math.max(2, world.r[i] * scale) + 3} y={world.y[i] * scale - 3} className="collision-inspect__label">{i + 1}</text>
              )}
            </g>
          ))}
        </svg>
        <svg className="collision-playground__canvas collision-inspect__line" style={{aspectRatio: 'auto'}} viewBox={`0 0 ${width} ${lineHeight}`}
             width={width} height={lineHeight} role="img" aria-label={t('collision_inspect_line')} data-testid="inspect-line">
          {Array.from({length: count}, (_, k) => {
            const i = trace.order[k]
            const y = lineTop + k * ROW_HEIGHT
            const state = left.has(i) ? 'left' : entered.has(i) ? 'active' : 'waiting'
            return (
              <g key={i} data-row={k} data-body={i + 1} data-state={state}>
                <text x={GUTTER - 4} y={y + 10} textAnchor="end" className="collision-inspect__label">{i + 1}</text>
                <rect x={px(world.x[i] - world.r[i])} y={y + 2} width={Math.max(1, ((2 * world.r[i]) / WORLD_WIDTH) * plotWidth)} height={9}
                      className={`collision-inspect__interval is-${state}${highlighted.has(i) ? ' is-current' : ''}`}/>
              </g>
            )
          })}
          {replay.sweepX !== null && (
            <line className="collision-inspect__sweep" data-testid="inspect-sweep" x1={px(replay.sweepX)} x2={px(replay.sweepX)} y1={0} y2={lineHeight}/>
          )}
        </svg>
      </div>
      <div className="collision-playground__controls">
        <Slider customText={t('collision_inspect_count')} min={INSPECT_MIN} max={INSPECT_MAX} step={1} value={count}
                onChange={v => {
                  // The number field also reports the unchanged value on blur; that must not restart the step-through.
                  const next = Math.max(INSPECT_MIN, Math.min(INSPECT_MAX, Math.round(v)))
                  if (next !== count) reset(next, seed)
                }}/>
        <div className="collision-playground__buttons">
          <button type="button" disabled={playing || shown <= 0} onClick={() => goTo(shown - 1)}>{t('collision_inspect_prev')}</button>
          <button type="button" disabled={playing || atEnd} onClick={() => goTo(shown + 1)}>{t('collision_inspect_next')}</button>
          <button type="button" aria-pressed={playing} onClick={togglePlay}>
            {playing ? t('collision_inspect_pause') : t('collision_inspect_play')}
          </button>
          <button type="button" onClick={() => reset(count, seed + 1)}>{t('collision_inspect_new')}</button>
        </div>
      </div>
      <p className="collision-inspect__event" data-testid="inspect-event">
        {playing ? eventText : `${t('collision_inspect_progress', {value0: formatInt(shown), value1: formatInt(trace.events.length)})}. ${eventText}`}
      </p>
      <div className="collision-inspect__active">
        <h4 id="collision-inspect-active">{t('collision_inspect_active')}</h4>
        {replay.active.length === 0 ? (
          <p>{t('collision_inspect_active_empty')}</p>
        ) : (
          <ul aria-labelledby="collision-inspect-active" data-testid="inspect-active">
            {replay.active.map(i => (
              <li key={i}>{t('collision_inspect_active_item', {value0: formatInt(i + 1), value1: formatInt(world.x[i] - world.r[i]), value2: formatInt(world.x[i] + world.r[i])})}</li>
            ))}
          </ul>
        )}
      </div>
      <ul className="collision-inspect__legend">
        <li>
          <svg width="32" height="8" aria-hidden="true"><line className="collision-inspect__pass" x1="0" x2="32" y1="4" y2="4"/></svg>
          {t('collision_inspect_legend_pass')}
        </li>
        <li>
          <svg width="32" height="8" aria-hidden="true"><line className="collision-inspect__reject" strokeDasharray={REJECT_DASH} x1="0" x2="32" y1="4" y2="4"/></svg>
          {t('collision_inspect_legend_reject')}
        </li>
      </ul>
      <p className="collision-playground__note" data-testid="inspect-caption">
        {t('collision_inspect_caption', {value0: formatInt(replay.boxTests), value1: formatInt(pairsTotal), value2: formatInt(count)})}
      </p>
      <div className="collision-playground__live" role="status" aria-live="polite" data-testid="inspect-live">{announcement}</div>
    </section>
  )
}
