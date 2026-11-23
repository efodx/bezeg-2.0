import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {message} from '../../localization';
import {CardShell} from './CardShell';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const handlers = {onFold: vi.fn(), onReset: vi.fn(), onDragMove: vi.fn(), onDrop: vi.fn(), onDragCancel: vi.fn()};

function render() {
  act(() => {
    root.render(createElement(CardShell, {
      id: 'readouts', title: message('shell_card_readouts'), rect: {x: 20, y: 30, w: 200, h: 120}, folded: false, ...handlers,
    }, createElement('p', {'data-testid': 'body'}, 'telo')));
  });
}
const q = <T extends Element>(selector: string) => host.querySelector(selector) as T;
function fire(target: Element, type: string, init: MouseEventInit & {key?: string} = {}) {
  act(() => { target.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, ...init})); });
}
function key(target: Element, k: string, shiftKey = false) {
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', {key: k, shiftKey, bubbles: true, cancelable: true})); });
}

beforeEach(() => {
  Object.values(handlers).forEach(fn => fn.mockClear());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('CardShell', () => {
  it('positions by transform from the rect', () => {
    render();
    const card = q<HTMLElement>('[data-card-id="readouts"]');
    expect(card.style.transform).toBe('translate(20px, 30px)');
    expect(card.style.width).toBe('200px');
  });

  it('starts no drag below the 4 px threshold and one above it', () => {
    render();
    const head = q<HTMLElement>('[data-card-head]');
    fire(head, 'pointerdown', {clientX: 50, clientY: 50});
    fire(head, 'pointermove', {clientX: 53, clientY: 50});
    expect(handlers.onDragMove).not.toHaveBeenCalled();
    fire(head, 'pointerup', {clientX: 53, clientY: 50});
    expect(handlers.onDrop).not.toHaveBeenCalled();

    fire(head, 'pointerdown', {clientX: 50, clientY: 50});
    fire(head, 'pointermove', {clientX: 55, clientY: 50});
    expect(handlers.onDragMove).toHaveBeenCalledWith({x: 55, y: 50});
    expect(q<HTMLElement>('[data-card-id]').style.transform).toBe('translate(25px, 30px)');
    fire(head, 'pointerup', {clientX: 55, clientY: 50});
    expect(handlers.onDrop).toHaveBeenCalledWith({x: 55, y: 50});
  });

  it('starts a pointer drag from the grip button, but not from the fold and reset buttons', () => {
    render();
    const grip = q<HTMLElement>('.board-card-grip');
    fire(grip, 'pointerdown', {clientX: 30, clientY: 40});
    fire(grip, 'pointermove', {clientX: 60, clientY: 40});
    expect(handlers.onDragMove).toHaveBeenCalledWith({x: 60, y: 40});
    fire(grip, 'pointerup', {clientX: 60, clientY: 40});
    expect(handlers.onDrop).toHaveBeenCalledWith({x: 60, y: 40});

    handlers.onDragMove.mockClear();
    const others = [...host.querySelectorAll<HTMLElement>('.board-card-head button:not(.board-card-grip)')];
    expect(others.length).toBe(2);
    for (const button of others) {
      fire(button, 'pointerdown', {clientX: 30, clientY: 40});
      fire(button, 'pointermove', {clientX: 90, clientY: 40});
      expect(handlers.onDragMove).not.toHaveBeenCalled();
    }
  });

  it('renders head actions between title and fold/reset, in tab order, without starting a drag', () => {
    act(() => {
      root.render(createElement(CardShell, {
        id: 'lesson', title: message('shell_card_readouts'), rect: {x: 20, y: 30, w: 200, h: 120}, folded: false, ...handlers,
        headActions: createElement('span', {role: 'button', tabIndex: 0, 'data-testid': 'act'}, 'A'),
      }));
    });
    const labels = [...host.querySelectorAll<HTMLElement>('.board-card-head button, [data-testid="act"]')].map((b) =>
      b.classList.contains('board-card-grip') ? 'grip' : b.dataset.testid === 'act' ? 'act' : b.classList.contains('board-card-fold') ? 'fold' : 'reset');
    expect(labels).toEqual(['grip', 'act', 'fold', 'reset']);
    const title = q<HTMLElement>('.board-card-title');
    expect(title.nextElementSibling?.querySelector('[data-testid="act"]')).not.toBeNull();
    const act1 = q<HTMLElement>('[data-testid="act"]');
    fire(act1, 'pointerdown', {clientX: 30, clientY: 40});
    fire(act1, 'pointermove', {clientX: 90, clientY: 40});
    expect(handlers.onDragMove).not.toHaveBeenCalled();
  });

  it('never starts a drag from the body', () => {
    render();
    const body = q<HTMLElement>('[data-testid="body"]');
    fire(body, 'pointerdown', {clientX: 50, clientY: 90});
    fire(body, 'pointermove', {clientX: 120, clientY: 90});
    fire(body, 'pointerup', {clientX: 120, clientY: 90});
    expect(handlers.onDragMove).not.toHaveBeenCalled();
    expect(handlers.onDrop).not.toHaveBeenCalled();
  });

  it('cancels a pointer drag', () => {
    render();
    const head = q<HTMLElement>('[data-card-head]');
    fire(head, 'pointerdown', {clientX: 0, clientY: 0});
    fire(head, 'pointermove', {clientX: 20, clientY: 0});
    fire(head, 'pointercancel');
    expect(handlers.onDragCancel).toHaveBeenCalledTimes(1);
  });

  it('moves by keyboard: pick up, step 10 and 40, drop, with announcements', () => {
    render();
    const grip = q<HTMLElement>('.board-card-grip');
    const status = q<HTMLElement>('[role="status"]');
    key(grip, 'ArrowRight');
    expect(handlers.onDragMove).not.toHaveBeenCalled();
    key(grip, 'Enter');
    expect(status.textContent).toContain('izbrana za premik');
    key(grip, 'ArrowRight');
    expect(handlers.onDragMove).toHaveBeenLastCalledWith({x: 130, y: 90});
    key(grip, 'ArrowDown', true);
    expect(handlers.onDragMove).toHaveBeenLastCalledWith({x: 130, y: 130});
    key(grip, 'Enter');
    expect(handlers.onDrop).toHaveBeenCalledWith({x: 130, y: 130});
    expect(status.textContent).toContain('je odložena');
  });

  it('cancels a keyboard move with Escape and resets with Home', () => {
    render();
    const grip = q<HTMLElement>('.board-card-grip');
    key(grip, ' ');
    key(grip, 'ArrowLeft');
    key(grip, 'Escape');
    expect(handlers.onDragCancel).toHaveBeenCalledTimes(1);
    expect(handlers.onDrop).not.toHaveBeenCalled();
    expect(q<HTMLElement>('[role="status"]').textContent).toContain('preklican');
    key(grip, 'Home');
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it('folds through an aria-expanded toggle and resets from the button', () => {
    render();
    const fold = q<HTMLElement>('.board-card-fold');
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    act(() => fold.click());
    expect(handlers.onFold).toHaveBeenCalledWith(true);
    act(() => q<HTMLElement>('[aria-label^="Vrni kartico"]').click());
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it('hides the body when folded and shows an overflow bar only when cut', () => {
    render();
    expect(host.querySelector('.board-card-more')).toBeNull();
    act(() => {
      root.render(createElement(CardShell, {id: 'readouts', title: message('shell_card_readouts'), rect: {x: 0, y: 0, w: 200, h: 80}, folded: false, cut: 80, ...handlers}, 'x'));
    });
    expect(host.querySelector('.board-card-more')).not.toBeNull();
    act(() => {
      root.render(createElement(CardShell, {id: 'readouts', title: message('shell_card_readouts'), rect: {x: 0, y: 0, w: 200, h: 40}, folded: true, ...handlers}, 'x'));
    });
    expect(host.querySelector('.board-card-body')).toBeNull();
    expect(q<HTMLElement>('.board-card-fold').getAttribute('aria-expanded')).toBe('false');
  });

  it('turns the transition off under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({matches: query.includes('reduce'), addEventListener: () => undefined, removeEventListener: () => undefined}));
    render();
    expect(q<HTMLElement>('[data-card-id]').style.transition).toBe('none');
  });
});
