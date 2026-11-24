// The grip of the pucks strip (task 05b): drags the strip as one unit by pointer, or moves it dock to dock by keyboard.
// It mirrors a card head's mechanics (`CardShell`: pickup, move past a threshold, drop, cancel; Enter picks up and drops, Esc cancels,
// blur cancels) but reports docks, not card placements, so it stays small and separate from the card shell.
import {useRef, useState} from 'react';
import type {KeyboardEvent, PointerEvent} from 'react';
import {useT} from '../../localization';
import type {StripDock} from '../layout/boardLayout';

/** A pointer position in board coordinates (relative to the strip's positioned parent). */
export interface StripPoint { x: number; y: number }

/** The ring the keyboard walks: left edge, bottom left, bottom centre, bottom right, right edge. */
export const STRIP_RING: readonly StripDock[] = ['left', 'bottom-left', 'bottom-centre', 'bottom-right', 'right'];

/** The dock one arrow key away: Left and Right walk the ring; Up and Down step between a bottom corner and the side above it. */
export function neighbourDock(dock: StripDock, key: string): StripDock {
    const at = STRIP_RING.indexOf(dock);
    if (key === 'ArrowLeft') return STRIP_RING[Math.max(0, at - 1)];
    if (key === 'ArrowRight') return STRIP_RING[Math.min(STRIP_RING.length - 1, at + 1)];
    if (key === 'ArrowUp') return dock === 'bottom-left' ? 'left' : dock === 'bottom-right' ? 'right' : dock;
    if (key === 'ArrowDown') return dock === 'left' ? 'bottom-left' : dock === 'right' ? 'bottom-right' : dock;
    return dock;
}

export interface StripGripProps {
    /** Which way the strip runs: a row's grip sits at its left end, a column's at its top end. */
    column: boolean;
    /** The dock a keyboard pickup would drop on now; announced as it changes. */
    candidate: StripDock;
    /** The strip is held by the keyboard. */
    picked: boolean;
    /** A card is being dragged: the strip does not start a drag. */
    blocked: boolean;
    onPickup: (point: StripPoint) => void;
    onMove: (point: StripPoint) => void;
    onDrop: (point: StripPoint) => void;
    onCancel: () => void;
    onKeyPick: () => void;
    onKeyMove: (key: string) => void;
    onKeyDrop: () => void;
    onKeyCancel: () => void;
}

const DRAG_THRESHOLD = 4;
const GripIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">{[5, 11].flatMap(x => [3, 8, 13].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3"/>))}</svg>;

export function StripGrip({column, candidate, picked, blocked, onPickup, onMove, onDrop, onCancel, onKeyPick, onKeyMove, onKeyDrop, onKeyCancel}: StripGripProps) {
    const t = useT();
    const ref = useRef<HTMLButtonElement>(null);
    const gesture = useRef<{start: StripPoint; at: StripPoint; active: boolean} | null>(null);
    const [said, setSaid] = useState('');
    const dockName = (dock: StripDock): string => {
        switch (dock) {
            case 'bottom-left': return t('strip_dock_bottom_left');
            case 'bottom-centre': return t('strip_dock_bottom_centre');
            case 'bottom-right': return t('strip_dock_bottom_right');
            case 'left': return t('strip_dock_left');
            default: return t('strip_dock_right');
        }
    };
    const toBoard = (clientX: number, clientY: number): StripPoint => {
        const origin = ref.current?.closest('.puck-strip')?.parentElement?.getBoundingClientRect();
        return {x: clientX - (origin?.left ?? 0), y: clientY - (origin?.top ?? 0)};
    };

    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (blocked || picked || (event.button !== undefined && event.button !== 0)) return;
        const start = toBoard(event.clientX, event.clientY);
        gesture.current = {start, at: start, active: false};
        onPickup(start);
        try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* not capturable */ }
    };
    const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        const current = gesture.current;
        if (!current) return;
        const at = toBoard(event.clientX, event.clientY);
        const active = current.active || Math.hypot(at.x - current.start.x, at.y - current.start.y) >= DRAG_THRESHOLD;
        gesture.current = {...current, at, active};
        if (active) onMove(at);
    };
    const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
        const current = gesture.current;
        if (!current) return;
        gesture.current = null;
        try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
        if (current.active) onDrop(current.at);
    };
    // A cancel (or a lost capture, which also ends the gesture) always clears the pickup; an inactive one has nothing else to undo.
    const onPointerCancel = () => {
        if (!gesture.current) return;
        gesture.current = null;
        onCancel();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!picked) { if (blocked) return; onKeyPick(); setSaid(t('strip_picked')); } else { onKeyDrop(); setSaid(t('strip_dropped', {value0: dockName(candidate)})); }
        } else if (event.key === 'Escape' && picked) {
            event.preventDefault();
            onKeyCancel();
            setSaid(t('strip_cancelled'));
        } else if (picked && event.key.startsWith('Arrow')) {
            event.preventDefault();
            const next = neighbourDock(candidate, event.key);
            if (next === candidate) return; // the end of the ring: silence, nothing changes
            onKeyMove(event.key);
            setSaid(t('strip_moved', {value0: dockName(next)}));
        }
    };
    const onBlur = () => { if (picked) { onKeyCancel(); setSaid(t('strip_cancelled')); } };

    return <>
        <button ref={ref} type="button" className={`puck-strip-grip${column ? ' puck-strip-grip--column' : ''}`} aria-label={t('strip_grip')} data-puck-strip-grip=""
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onLostPointerCapture={onPointerCancel}
            onKeyDown={onKeyDown} onBlur={onBlur}><GripIcon/></button>
        <div className="puck-strip-status" role="status" aria-live="polite">{said}</div>
    </>;
}
