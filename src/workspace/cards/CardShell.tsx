import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {KeyboardEvent, PointerEvent, ReactNode} from 'react';
import {renderMessage, useT} from '../../localization';
import type {Message} from '../../localization';
import type {Rect} from '../layout/boardLayout';
import './CardShell.css';

/** A pointer position in board coordinates (relative to the shell's positioned parent). */
export interface BoardPoint { x: number; y: number }

export interface CardShellProps {
  id: string;
  title: Message;
  /** Where the card sits, from `layoutBoard`. Absent: the card lies in normal flow (the hidden measure pass). */
  rect?: Rect;
  folded: boolean;
  /** Height the layout cut the card to; the body then scrolls behind an overflow bar. */
  cut?: number | null;
  onFold: (folded: boolean) => void;
  onReset: () => void;
  /** The parent runs `dropTarget` / `applyDrop`; the shell only reports where the pointer is. */
  onDragMove: (pointer: BoardPoint) => void;
  /** The pointer went down on the card (before any move): where it grabbed, for a free drop's offset. */
  onPickup?: (pointer: BoardPoint | null) => void;
  onDrop: (pointer: BoardPoint) => void;
  onDragCancel: () => void;
  children?: ReactNode;
}

const DRAG_THRESHOLD = 4;
const STEP = 10;
const STEP_LARGE = 40;
const ARROWS: Record<string, [number, number]> = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};

function usePrefersReducedMotion(): boolean {
  const query = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const list = query();
    if (!list) return undefined;
    const update = () => setReduced(list.matches);
    update();
    list.addEventListener?.('change', update);
    return () => list.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

const Chevron = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const GripIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">{[5, 11].flatMap(x => [3, 8, 13].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3"/>))}</svg>;
const ResetIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const REVEAL_MS = 260;
const REVEAL_EASING = 'cubic-bezier(.22, 1, .36, 1)';
const SETTLE_MS = 280;

/** The width and height currently visible, given the card's laid-out size and a running reveal clip (computed `inset(t r b l)`). */
export function visibleSize(full: {w: number; h: number}, clip: string): {w: number; h: number} {
  const m = /inset\(\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)/.exec(clip);
  if (!m) return full;
  return {w: full.w - parseFloat(m[2]) - parseFloat(m[4]), h: full.h - parseFloat(m[1]) - parseFloat(m[3])};
}

interface Drag { start: BoardPoint; at: BoardPoint; active: boolean; keyboard: boolean }

export function CardShell({id, title, rect, folded, cut = null, onFold, onReset, onDragMove, onPickup, onDrop, onDragCancel, children}: CardShellProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [said, setSaid] = useState('');
  const reduced = usePrefersReducedMotion();
  const name = renderMessage(title);

  const update = (next: Drag | null) => { dragRef.current = next; setDrag(next); };
  const toBoard = (clientX: number, clientY: number): BoardPoint => {
    const origin = root.current?.parentElement?.getBoundingClientRect();
    return {x: clientX - (origin?.left ?? 0), y: clientY - (origin?.top ?? 0)};
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== undefined && event.button !== 0) return;
    const button = (event.target as HTMLElement).closest('button');
    if (button && !button.classList.contains('board-card-grip')) return;
    const start = toBoard(event.clientX, event.clientY);
    update({start, at: start, active: false, keyboard: false});
    onPickup?.(start);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* not capturable */ }
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current || current.keyboard) return;
    const at = toBoard(event.clientX, event.clientY);
    const active = current.active || Math.hypot(at.x - current.start.x, at.y - current.start.y) >= DRAG_THRESHOLD;
    if (!active) return;
    update({...current, at, active});
    onDragMove(at);
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current || current.keyboard) return;
    update(null);
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
    if (current.active) onDrop(current.at);
    else onPickup?.(null);
  };
  const onPointerCancel = () => {
    const current = dragRef.current;
    if (!current || current.keyboard) return;
    update(null);
    if (current.active) onDragCancel();
    else onPickup?.(null);
  };

  const onGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    const picked = current?.keyboard === true;
    if (event.key === 'Home') {
      event.preventDefault();
      if (picked) { update(null); onDragCancel(); }
      onReset();
      setSaid(t('shell_reset_done', {value0: name}));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!picked) {
        const box = root.current?.getBoundingClientRect();
        const center = toBoard((box?.left ?? 0) + (box?.width ?? 0) / 2, (box?.top ?? 0) + (box?.height ?? 0) / 2);
        const at = rect ? {x: rect.x + rect.w / 2, y: rect.y + rect.h / 2} : center;
        update({start: at, at, active: true, keyboard: true});
        setSaid(t('shell_picked', {value0: name}));
      } else if (current) {
        update(null);
        onDrop(current.at);
        setSaid(t('shell_dropped', {value0: name}));
      }
    } else if (event.key === 'Escape' && picked) {
      event.preventDefault();
      update(null);
      onDragCancel();
      setSaid(t('shell_cancelled', {value0: name}));
    } else if (picked && current && ARROWS[event.key]) {
      event.preventDefault();
      const [dx, dy] = ARROWS[event.key];
      const step = event.shiftKey ? STEP_LARGE : STEP;
      const at = {x: current.at.x + dx * step, y: current.at.y + dy * step};
      update({...current, at});
      onDragMove(at);
    }
  };
  const onGripBlur = () => {
    if (dragRef.current?.keyboard) { update(null); onDragCancel(); setSaid(t('shell_cancelled', {value0: name})); }
  };

  const dragging = drag?.active === true;
  // After a drop the card keeps its place above the others for the length of its glide.
  const [settling, setSettling] = useState(false);
  const wasDragging = useRef(false);
  useEffect(() => {
    if (wasDragging.current && !dragging && !reduced) {
      setSettling(true);
      const timer = window.setTimeout(() => setSettling(false), SETTLE_MS);
      wasDragging.current = dragging;
      return () => window.clearTimeout(timer);
    }
    wasDragging.current = dragging;
    return undefined;
  }, [dragging, reduced]);

  // Size changes never animate width or height (that would reflow the text mid-glide): the box takes its final size at once and
  // a card that grew is revealed by a clip from the size it showed to its full size. A new change while one runs starts from what
  // is visible now (read from the running animation), so interruption never jumps. A card that shrank simply ends at its size.
  const width = rect?.w;
  const height = rect?.h;
  const shown = useRef<{w: number; h: number} | null>(null);
  const reveal = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || width === undefined || height === undefined) return;
    const full = {w: width, h: height};
    const previous = shown.current;
    let from = previous;
    if (reveal.current && previous) {
      from = visibleSize(previous, getComputedStyle(el).clipPath);
      reveal.current.cancel();
      reveal.current = null;
    }
    shown.current = full;
    if (!from || reduced || dragging || typeof el.animate !== 'function') return;
    const right = Math.max(0, full.w - from.w);
    const bottom = Math.max(0, full.h - from.h);
    if (right < 0.5 && bottom < 0.5) return;
    const animation = el.animate(
      [{clipPath: `inset(0px ${right}px ${bottom}px 0px)`}, {clipPath: 'inset(0px 0px 0px 0px)'}],
      {duration: REVEAL_MS, easing: REVEAL_EASING});
    reveal.current = animation;
    const done = () => { if (reveal.current === animation) reveal.current = null; };
    animation.onfinish = done;
    animation.oncancel = done;
  }, [width, height, reduced, dragging]);
  const offset = dragging && drag ? {x: drag.at.x - drag.start.x, y: drag.at.y - drag.start.y} : {x: 0, y: 0};
  const style = rect
    ? {
      width: rect.w,
      height: rect.h,
      transform: `translate(${rect.x + offset.x}px, ${rect.y + offset.y}px)`,
      ...(reduced ? {transition: 'none'} : {}),
    }
    : undefined;
  const classes = ['board-card', rect ? '' : 'board-card--static', folded ? 'board-card--folded' : '', cut !== null ? 'board-card--cut' : '', dragging ? 'board-card--dragging' : '', settling ? 'board-card--settling' : '']
    .filter(Boolean).join(' ');
  const scrollMore = () => body.current?.scrollBy?.({top: Math.max(40, body.current.clientHeight - 24), behavior: reduced ? 'auto' : 'smooth'});

  return (
    <div ref={root} className={classes} data-card-id={id} style={style}>
      <div className="board-card-head" data-card-head
           onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
        <button type="button" className="board-card-button board-card-grip" aria-label={t('shell_grip', {value0: name})}
                onKeyDown={onGripKeyDown} onBlur={onGripBlur}><GripIcon/></button>
        <h3 className="board-card-title">{name}</h3>
        <button type="button" className="board-card-button" aria-label={t('shell_reset', {value0: name})} onClick={() => { onReset(); }}><ResetIcon/></button>
        <button type="button" className="board-card-button board-card-fold" aria-expanded={!folded} aria-label={name}
                onClick={() => onFold(!folded)}><Chevron/></button>
      </div>
      {!folded && <div ref={body} className="board-card-body">{children}</div>}
      {!folded && cut !== null && <button type="button" className="board-card-more" onClick={scrollMore}>{t('shell_more')}</button>}
      {rect && <div className="board-card-status" role="status" aria-live="polite">{said}</div>}
    </div>
  );
}
