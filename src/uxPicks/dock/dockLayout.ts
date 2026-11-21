import {useSyncExternalStore} from 'react';

/**
 * Where the dock's cards sit: which stack (left, right, bottom right) and in which order. Each stack is a vertical list.
 * A card that is picked up leaves a reserved gap (`gap`) in its stack; the gap moves to the position the card would
 * take if dropped now, and the cards between the old and the new position make room (the cards animate with FLIP).
 * Placements are remembered per page in localStorage.
 */
export type Target = 'top-start' | 'top-end' | 'bottom-end' | 'top-row' | 'bottom-row';
/** Every stack has an axis: 'v' stacks cards top to bottom, 'h' side by side. A further region is one entry here and in BoardDock. */
export const AXIS: Record<Target, 'v' | 'h'> = {'top-start': 'v', 'top-end': 'v', 'bottom-end': 'v', 'top-row': 'h', 'bottom-row': 'h'};
export const TARGETS: readonly Target[] = ['top-start', 'top-end', 'bottom-end', 'top-row', 'bottom-row'];
/** The graph dock's stack the lesson card can take a place in (in memory only: lessons restart at home). */
export const LESSON = 'lesson';
export interface Outline { region: Target; x: number; y: number; w: number; h: number; bar: boolean; label?: string; }
interface Placement { region: Target; order: number; }
export interface Gap { kind: string; region: Target; index: number; w: number; h: number; }

const regs = new Map<string, Placement>();
const floating = new Set<string>();
let placed: Record<string, Placement> = {};
/** The place the picked-up card left (kept open while it is over no target) and the place it would take if dropped now. */
let origin: Gap | null = null;
let target: Gap | null = null;
let lifted: string | null = null;
let version = 0;
let path = '';
const listeners = new Set<() => void>();

const storeKey = () => `ux-dock-layout:${window.location.pathname}`;
function load() {
    path = window.location.pathname;
    placed = {};
    try {
        const raw = JSON.parse(localStorage.getItem(storeKey()) ?? '{}') as Record<string, Placement>;
        for (const [kind, p] of Object.entries(raw)) {
            if (p && TARGETS.includes(p.region) && Number.isFinite(p.order)) placed[kind] = {region: p.region, order: p.order};
        }
    } catch { /* ignore */ }
}
function save() {
    try {
        const {[LESSON]: _lesson, ...rest} = placed;
        localStorage.setItem(storeKey(), JSON.stringify(rest));
    } catch { /* ignore */ }
}
let outlines: Outline[] | null = null;
let outlineOwner = '';
export function getOutlines() { return outlines; }
/** The preview slots of the drag in progress (null clears them, only for their owner). */
export function setOutlines(owner: string, list: Outline[] | null) {
    if (list === null && owner !== outlineOwner) return;
    if (list === null ? outlines === null : outlines !== null && JSON.stringify(outlines) === JSON.stringify(list)) return;
    outlines = list; outlineOwner = owner; emit();
}
interface Host { regions: Partial<Record<string, HTMLElement | null>>; frame: HTMLElement | null; }
let host: Host | null = null;
export function setHost(h: Host | null) { host = h; }
export function getHost() { return host; }
let lessonSize = {w: 0, h: 0};
let lessonEl: HTMLElement | null = null;
export function getLessonSize() { return lessonSize; }
export function setLessonSize(w: number, h: number) { if (lessonSize.w !== w || lessonSize.h !== h) { lessonSize = {w, h}; emit(); } }
export function setPlaceholderEl(el: HTMLElement | null) { lessonEl = el; }
export function getPlaceholderEl() { return lessonEl; }
/** True while the lesson card holds a place (a placeholder, or the gap it left while lifted) in a graph stack. */
export function lessonLifted() { return floating.has(LESSON); }
export function lessonSlotted() { return regs.has(LESSON); }
/** The lesson card leaves its graph place (home, or floating free): the placeholder is freed. */
export function releaseLesson() {
    if (!regs.has(LESSON) && !placed[LESSON] && lifted !== LESSON) return;
    regs.delete(LESSON); delete placed[LESSON]; floating.delete(LESSON);
    if (lifted === LESSON) { origin = null; target = null; lifted = null; }
    emit();
}
function emit() { version++; listeners.forEach(l => l()); }

/** Subscribes the component to every layout change. */
export function useDockLayout(): number {
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => version, () => 0);
}

/** A new page keeps its own placements. */
export function syncPath() { if (window.location.pathname !== path) { load(); emit(); } }

export function registerCard(kind: string, region: Target, order: number) {
    if (path === '') load();
    regs.set(kind, {region, order});
    emit();
    return () => { regs.delete(kind); floating.delete(kind); if (lifted === kind) { origin = null; target = null; lifted = null; } emit(); };
}
export function placementOf(kind: string): Placement { return placed[kind] ?? regs.get(kind) ?? {region: 'top-end', order: 0}; }
export function setFloating(kind: string, on: boolean) {
    if (floating.has(kind) === on) return;
    if (on) floating.add(kind); else floating.delete(kind);
    emit();
}
/** The gap the stacks show: the drop target's, else the pickup place. `isTarget` marks the emphasised one. */
export function currentGap(): (Gap & {isTarget: boolean}) | null {
    const g = target ?? origin;
    return g ? {...g, isTarget: target !== null} : null;
}

/** The docked cards of a stack, top to bottom. */
export function stackOf(region: Target): string[] {
    return [...regs.keys()].filter(k => !floating.has(k) && placementOf(k).region === region)
        .sort((a, b) => placementOf(a).order - placementOf(b).order || (a < b ? -1 : 1));
}

/** The CSS `order` of a docked card: cards make room for the gap, which has order `2 * index`. */
export function orderOf(kind: string): number {
    const region = placementOf(kind).region;
    const i = stackOf(region).indexOf(kind);
    const gap = target ?? origin;
    return gap && gap.region === region && i >= gap.index ? 2 * i + 3 : 2 * i + 1;
}

/** Picks a card up: its place stays reserved as the gap. */
export function pickUp(kind: string, w: number, h: number, docked: boolean) {
    const region = placementOf(kind).region;
    const index = Math.max(0, stackOf(region).indexOf(kind));
    lifted = kind;
    origin = docked ? {kind, region, index, w, h} : null;
    target = null;
    floating.add(kind);
    emit();
}
/** Moves the gap to a stack position (or removes it when the card is not over a target). */
export function setGap(kind: string, region: Target | null, index: number, w: number, h: number) {
    const same = region === null ? target === null : target !== null && target.region === region && target.index === index && target.w === w && target.h === h;
    if (same) return;
    target = region === null ? null : {kind, region, index, w, h};
    emit();
}
/** Docks the card at the gap; false when there is none. */
export function dropAtGap(kind: string): boolean {
    if (!target || target.kind !== kind) return false;
    const gap = target;
    const others = stackOf(gap.region).filter(k => k !== kind);
    const prev = others[gap.index - 1], next = others[gap.index];
    const p = prev === undefined ? undefined : placementOf(prev).order, n = next === undefined ? undefined : placementOf(next).order;
    const order = p !== undefined && n !== undefined ? (p + n) / 2 : p !== undefined ? p + 1 : n !== undefined ? n - 1 : 0;
    placed[kind] = {region: gap.region, order};
    if (kind === LESSON) regs.set(kind, placed[kind]);
    floating.delete(kind);
    origin = null; target = null; lifted = null;
    save(); emit();
    return true;
}
/** Ends a pickup without docking: the old gap closes. */
export function clearGap(kind: string) { if (lifted === kind) { origin = null; target = null; lifted = null; emit(); } }
/** Back to the card's default dock. */
export function resetCard(kind: string) {
    delete placed[kind];
    floating.delete(kind);
    if (lifted === kind) { origin = null; target = null; lifted = null; }
    save(); emit();
}
