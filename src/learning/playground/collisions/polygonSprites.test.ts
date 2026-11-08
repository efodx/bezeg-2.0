import {describe, expect, it} from 'vitest'
import {createPolygonSpriteCache, spriteGeometry} from './polygonSprites'
import type {SpriteParams} from './polygonSprites'

const base: SpriteParams = {unit: 2, dpr: 1, stage: 'boxes', body: '#111', touching: '#222', outline: '#333'}

function counting() {
  let renders = 0
  const cache = createPolygonSpriteCache(() => {
    renders++
    return {} as CanvasImageSource
  }, 4)
  return {cache, renders: () => renders}
}

describe('polygon sprite cache', () => {
  it('reuses the sprite of a template and kind while the key is unchanged', () => {
    const {cache, renders} = counting()
    const a = cache.get(0, 'plain', base)
    expect(renders()).toBe(1)
    expect(cache.get(0, 'plain', {...base})).toBe(a)
    expect(renders()).toBe(1)
    cache.get(1, 'plain', base)
    cache.get(0, 'hit', base)
    expect(renders()).toBe(3)
  })

  it.each([
    ['unit', {unit: 3}],
    ['dpr', {dpr: 2}],
    ['stage', {stage: 'hulls' as const}],
    ['body colour', {body: '#999'}],
    ['touching colour', {touching: '#999'}],
    ['outline colour', {outline: '#999'}],
  ])('rebuilds when %s changes', (_name, change) => {
    const {cache, renders} = counting()
    const a = cache.get(0, 'plain', base)
    const b = cache.get(0, 'plain', {...base, ...change})
    expect(renders()).toBe(2)
    expect(b).not.toBe(a)
  })

  it('rebuilds after reset', () => {
    const {cache, renders} = counting()
    cache.get(0, 'plain', base)
    cache.reset()
    cache.get(0, 'plain', base)
    expect(renders()).toBe(2)
  })

  it('centres the sprite on the template origin with room for the stroke', () => {
    const g = spriteGeometry(10, 5, 2, 1, 'hulls')
    expect(g.width).toBe(40 + 2 * 4)
    expect(g.height).toBe(20 + 2 * 4)
    expect(g.cx).toBe(g.width / 2)
    expect(g.cy).toBe(g.height / 2)
  })
})
