import {POLYGON_TEMPLATES} from '../../../compgeo/collisions/polygonTemplates'
import type {ConvexPart} from '../../../compgeo/collisions/polygonTemplates'

/** The overlay stages of the polygon world. */
export type PolygonStage = 'boxes' | 'hulls' | 'pieces'

/** Everything a sprite's pixels depend on. A change in any field rebuilds the sprites. */
export interface SpriteParams {
  /** Device pixels per template unit. */
  unit: number
  dpr: number
  stage: PolygonStage
  body: string
  touching: string
  outline: string
}

/** A body sprite: the template filled (plain or touching colour) with the stage outline stroked on top. */
export interface TemplateSprite {
  image: CanvasImageSource
  /** Sprite size in device pixels and the template origin inside it. */
  width: number
  height: number
  cx: number
  cy: number
}

/** The 'Fill' kinds have no stage outline: for rotated bodies in the box stage, whose axis-aligned box is drawn separately. */
export type SpriteKind = 'plain' | 'hit' | 'plainFill' | 'hitFill'
const KIND_SLOT: Readonly<Record<SpriteKind, number>> = {plain: 0, hit: 1, plainFill: 2, hitFill: 3}

/** Dash pattern per stage in CSS pixels, so the stages differ by more than colour: dashed, dotted, solid. */
export const STAGE_DASH: Readonly<Record<PolygonStage, readonly number[]>> = {boxes: [6, 4], hulls: [2, 4], pieces: []}
/** Outline width per stage in CSS pixels: the dots of the hull stage need two pixels to read as dots. */
export const STAGE_WIDTH: Readonly<Record<PolygonStage, number>> = {boxes: 1, hulls: 2, pieces: 1}

export interface SpriteGeometry {
  width: number
  height: number
  cx: number
  cy: number
}

/** Sprite size and template-origin offset from the template half extents, leaving room for the stroke. */
export function spriteGeometry(hx: number, hy: number, unit: number, dpr: number, stage: PolygonStage): SpriteGeometry {
  // The pad is an empirical margin covering the stroke and its miter joins for the current templates at dpr 1-3.
  const pad = Math.ceil(STAGE_WIDTH[stage] * dpr) + 2
  // Even sizes keep the template origin on a whole pixel, so a body and its touching ring share a centre.
  const even = (n: number): number => Math.max(2, 2 * Math.ceil(n / 2))
  const width = even(2 * unit * hx + 2 * pad)
  const height = even(2 * unit * hy + 2 * pad)
  return {width, height, cx: width / 2, cy: height / 2}
}

type Render = (template: number, kind: SpriteKind, params: SpriteParams, geometry: SpriteGeometry) => CanvasImageSource

const sameParams = (a: SpriteParams, b: SpriteParams): boolean =>
  a.unit === b.unit && a.dpr === b.dpr && a.stage === b.stage && a.body === b.body && a.touching === b.touching && a.outline === b.outline

export interface PolygonSpriteCache {
  /** The sprite of a template, rendered on first use and reused while `params` stay the same. */
  get(template: number, kind: SpriteKind, params: SpriteParams): TemplateSprite
  /** Drops every sprite. */
  reset(): void
}

/**
 * A cache of per-template sprites. It is owned by whoever creates it (the playground keeps one per component) and
 * holds at most two small canvases per template; `reset` releases them.
 */
export function createPolygonSpriteCache(render: Render, templateCount: number = POLYGON_TEMPLATES.length): PolygonSpriteCache {
  let current: SpriteParams | null = null
  /** The params object last compared (callers must pass a new object when values change, never mutate one). */
  let verified: SpriteParams | null = null
  const fresh = (): (TemplateSprite | undefined)[] => new Array<TemplateSprite | undefined>(4 * templateCount)
  let entries = fresh()
  return {
    get(template, kind, params) {
      if (params !== verified) {
        if (!current || !sameParams(current, params)) {
          current = {...params}
          entries = fresh()
        }
        verified = params
      }
      const slot = 4 * template + KIND_SLOT[kind]
      let entry = entries[slot]
      if (!entry) {
        const shape = POLYGON_TEMPLATES[template]
        const g = spriteGeometry(shape.hx, shape.hy, params.unit, params.dpr, params.stage)
        entry = {image: render(template, kind, params, g), ...g}
        entries[slot] = entry
      }
      return entry
    },
    reset() {
      current = null
      verified = null
      entries = fresh()
    },
  }
}

function trace(ctx: CanvasRenderingContext2D, part: ConvexPart | {xs: ArrayLike<number>; ys: ArrayLike<number>; size: number}, unit: number, cx: number, cy: number): void {
  const xs = 'px' in part ? part.px : part.xs
  const ys = 'py' in part ? part.py : part.ys
  for (let v = 0; v < part.size; v++) {
    if (v === 0) ctx.moveTo(cx + unit * xs[v], cy + unit * ys[v])
    else ctx.lineTo(cx + unit * xs[v], cy + unit * ys[v])
  }
  ctx.closePath()
}

/** Renders one sprite onto a canvas element. Used by the playground; tests inject their own render. */
export const renderSpriteToCanvas: Render = (template, kind, params, g) => {
  const canvas = document.createElement('canvas')
  canvas.width = g.width
  canvas.height = g.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const shape = POLYGON_TEMPLATES[template]
  const {unit, dpr, stage} = params
  ctx.beginPath()
  trace(ctx, {xs: shape.vertices.map((p) => p.x), ys: shape.vertices.map((p) => p.y), size: shape.vertices.length}, unit, g.cx, g.cy)
  ctx.fillStyle = kind === 'hit' || kind === 'hitFill' ? params.touching : params.body
  ctx.globalAlpha = kind === 'hit' || kind === 'hitFill' ? 1 : 0.85
  ctx.fill()
  ctx.globalAlpha = 1
  if (kind === 'plainFill' || kind === 'hitFill') return canvas
  ctx.beginPath()
  if (stage === 'boxes') ctx.rect(g.cx - unit * shape.hx, g.cy - unit * shape.hy, 2 * unit * shape.hx, 2 * unit * shape.hy)
  else if (stage === 'hulls') trace(ctx, shape.hull, unit, g.cx, g.cy)
  else for (const piece of shape.pieces) trace(ctx, piece, unit, g.cx, g.cy)
  ctx.strokeStyle = params.outline
  ctx.lineWidth = STAGE_WIDTH[stage] * dpr
  ctx.setLineDash(STAGE_DASH[stage].map((d) => d * dpr))
  ctx.stroke()
  return canvas
}
