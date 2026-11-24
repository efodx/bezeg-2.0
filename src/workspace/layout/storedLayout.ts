// Stored board layout: one versioned, validated, app-wide record of the learner's
// card placements and folds. Spec: docs/reviews/ux-picks-app-wide/03-layout-design.md.
// Pattern follows src/localization/index.ts: appStorage access wrapped in try/catch,
// failure never throws. The lesson card's placement is stored like any card's (task 04); its fold is
// never stored, because folding the lesson card is its explore mode.
import {appStorage} from '../../storage/appStorage';
import type {Anchor, Placement, StripDock} from './boardLayout';

export const BOARD_LAYOUT_KEY = 'board-layout';
export const BOARD_LAYOUT_VERSION = 1;
/** The lesson card: placement stored, fold never stored (a fold is the lesson's explore mode, session-only). */
export const LESSON_CARD_ID = 'lesson';

export interface StoredBoardLayout {
    placements: Record<string, Placement>;
    folds: Record<string, boolean>;
    /** Where the pucks strip docks; absent means the default (bottom-left). */
    strip?: StripDock;
}

const STRIP_DOCKS: readonly StripDock[] = ['bottom-left', 'bottom-centre', 'bottom-right', 'left', 'right'];
const ANCHORS: readonly Anchor[] = ['tl', 'tc', 'tr', 'ml', 'mr', 'bc', 'br'];
const COORD_LIMIT = 1e6;

export const emptyBoardLayout = (): StoredBoardLayout => ({placements: {}, folds: {}});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCoord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= COORD_LIMIT;

function parsePlacement(v: unknown): Placement | null {
    if (!isRecord(v)) return null;
    if (v.kind === 'docked') {
        const {anchor, order} = v;
        if (typeof anchor !== 'string' || !ANCHORS.includes(anchor as Anchor)) return null;
        if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) return null;
        return {kind: 'docked', anchor: anchor as Anchor, order};
    }
    if (v.kind === 'free') {
        if (!isCoord(v.x) || !isCoord(v.y)) return null;
        return {kind: 'free', x: v.x, y: v.y};
    }
    return null;
}

/** Validate parsed JSON. Wrong version or shape of the whole record gives the
 * defaults; inside a valid record each bad entry is dropped on its own, so one
 * corrupt card does not discard the learner's other placements. */
export function parseBoardLayout(raw: unknown): StoredBoardLayout {
    const result = emptyBoardLayout();
    if (!isRecord(raw) || raw.version !== BOARD_LAYOUT_VERSION) return result;
    if (isRecord(raw.placements)) {
        for (const [id, value] of Object.entries(raw.placements)) {
            const placement = parsePlacement(value);
            if (placement) result.placements[id] = placement;
        }
    }
    if (isRecord(raw.folds)) {
        for (const [id, value] of Object.entries(raw.folds)) {
            if (id === LESSON_CARD_ID) continue;
            if (typeof value === 'boolean') result.folds[id] = value;
        }
    }
    if (typeof raw.strip === 'string' && STRIP_DOCKS.includes(raw.strip as StripDock)) result.strip = raw.strip as StripDock;
    return result;
}

export function loadBoardLayout(storage: Storage = appStorage): StoredBoardLayout {
    try {
        const text = storage.getItem(BOARD_LAYOUT_KEY);
        if (text === null) return emptyBoardLayout();
        return parseBoardLayout(JSON.parse(text));
    } catch {
        return emptyBoardLayout();
    }
}

/** Returns false when storage refused the write (quota, disabled storage); the
 * in-memory layout stays valid and the caller may ignore the result. */
export function saveBoardLayout(layout: StoredBoardLayout, storage: Storage = appStorage): boolean {
    try {
        const clean = parseBoardLayout({version: BOARD_LAYOUT_VERSION, ...layout});
        storage.setItem(BOARD_LAYOUT_KEY, JSON.stringify({version: BOARD_LAYOUT_VERSION, ...clean}));
        return true;
    } catch {
        return false;
    }
}

export function setPlacement(layout: StoredBoardLayout, id: string, placement: Placement): StoredBoardLayout {
    return {...layout, placements: {...layout.placements, [id]: placement}};
}

export function setFold(layout: StoredBoardLayout, id: string, folded: boolean): StoredBoardLayout {
    if (id === LESSON_CARD_ID) return layout;
    return {...layout, folds: {...layout.folds, [id]: folded}};
}

/** Forget one card's placement and fold, so it returns to its defaults. */
export function resetCard(layout: StoredBoardLayout, id: string): StoredBoardLayout {
    const {[id]: _p, ...placements} = layout.placements;
    const {[id]: _f, ...folds} = layout.folds;
    return {...layout, placements, folds};
}

export function setStripDock(layout: StoredBoardLayout, dock: StripDock): StoredBoardLayout {
    return {...layout, strip: dock};
}

/** Forget every stored placement and fold, and remove the record. */
export function resetAll(storage: Storage = appStorage): StoredBoardLayout {
    try { storage.removeItem(BOARD_LAYOUT_KEY); } catch { /* storage unavailable: defaults still apply */ }
    return emptyBoardLayout();
}
