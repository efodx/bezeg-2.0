import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {message} from '../../localization';
import type {Rect} from '../layout/boardLayout';
import {CardShell, visibleSize} from './CardShell';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const noop = () => undefined;
function render(rect: Rect) {
  act(() => {
    root.render(createElement(CardShell, {
      id: 'readouts', title: message('shell_card_readouts'), rect, folded: false,
      onFold: noop, onReset: noop, onDragMove: noop, onDrop: noop, onDragCancel: noop,
    }, createElement('p', null, 'telo')));
  });
}
const card = () => host.querySelector<HTMLElement>('[data-card-id="readouts"]')!;

interface FakeAnimation { keyframes: Keyframe[]; cancelled: boolean; cancel: () => void; onfinish: null | (() => void); oncancel: null | (() => void) }
let animations: FakeAnimation[];

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  animations = [];
  HTMLElement.prototype.animate = function (keyframes: Keyframe[] | PropertyIndexedKeyframes | null) {
    const animation: FakeAnimation = {
      keyframes: keyframes as Keyframe[], cancelled: false, onfinish: null, oncancel: null,
      cancel() { animation.cancelled = true; },
    };
    animations.push(animation);
    return animation as unknown as Animation;
  } as unknown as HTMLElement['animate'];
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as {animate?: unknown}).animate;
});

describe('CardShell motion', () => {
  it('moves by transform only: width and height are never transitioned', async () => {
    const css = (await import('node:fs')).readFileSync('src/workspace/cards/CardShell.css', 'utf8');
    const rule = /\.board-card\s*\{[^}]*\}/.exec(css)![0];
    expect(rule).toMatch(/transition:\s*transform/);
    expect(rule).not.toMatch(/transition:[^;]*(width|height)/);
  });

  it('reduced motion turns every glide into an instant move and plays no reveal', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({matches: query.includes('reduce'), addEventListener: noop, removeEventListener: noop}));
    render({x: 0, y: 0, w: 200, h: 100});
    render({x: 50, y: 40, w: 260, h: 180});
    expect(card().style.transition).toBe('none');
    expect(animations).toHaveLength(0);
  });

  it('a card that grew is revealed from the size it showed, at its final size', () => {
    render({x: 0, y: 0, w: 200, h: 100});
    expect(animations).toHaveLength(0);
    render({x: 0, y: 0, w: 200, h: 180});
    expect(card().style.height).toBe('180px');
    expect(animations).toHaveLength(1);
    expect(animations[0].keyframes[0].clipPath).toBe('inset(0px 0px 80px 0px)');
  });

  it('a card that shrank takes its size at once without a reveal', () => {
    render({x: 0, y: 0, w: 200, h: 180});
    render({x: 0, y: 0, w: 200, h: 100});
    expect(animations).toHaveLength(0);
  });

  it('a growth interrupted by another change starts from what is visible now, never from a jump', () => {
    render({x: 0, y: 0, w: 200, h: 100});
    render({x: 0, y: 0, w: 200, h: 180});
    // Mid-reveal the clip hides 30 px of the 180 px box: 150 px are visible.
    const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({clipPath: 'inset(0px 0px 30px 0px)'} as CSSStyleDeclaration);
    render({x: 0, y: 0, w: 200, h: 240});
    spy.mockRestore();
    expect(animations[0].cancelled).toBe(true);
    expect(animations).toHaveLength(2);
    expect(animations[1].keyframes[0].clipPath).toBe('inset(0px 0px 90px 0px)'); // 240 - 150
  });

  it('visibleSize reads the running clip and falls back to the full size', () => {
    expect(visibleSize({w: 200, h: 180}, 'inset(0px 10px 30px 0px)')).toEqual({w: 190, h: 150});
    expect(visibleSize({w: 200, h: 180}, 'none')).toEqual({w: 200, h: 180});
  });

  it('a move retargets by transform: the new rect is the only inline target, the old position is not re-applied', () => {
    render({x: 10, y: 10, w: 200, h: 100});
    render({x: 300, y: 10, w: 200, h: 100});
    render({x: 20, y: 200, w: 200, h: 100});
    expect(card().style.transform).toBe('translate(20px, 200px)');
    expect(card().style.transition).toBe('');
  });
});
