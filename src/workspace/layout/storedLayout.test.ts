import {describe, expect, it} from 'vitest';
import {
    BOARD_LAYOUT_KEY, BOARD_LAYOUT_VERSION, emptyBoardLayout, loadBoardLayout, parseBoardLayout, resetAll, resetCard, saveBoardLayout, setFold,
    setPlacement, setStripDock,
} from './storedLayout';

function fakeStorage(initial: Record<string, string> = {}, throwOnSet = false): Storage {
    const data = new Map(Object.entries(initial));
    return {
        get length() { return data.size; },
        clear: () => data.clear(),
        getItem: k => data.get(k) ?? null,
        key: i => [...data.keys()][i] ?? null,
        removeItem: k => { data.delete(k); },
        setItem: (k, v) => { if (throwOnSet) throw new Error('quota'); data.set(k, v); },
    };
}
const withRecord = (record: unknown) => fakeStorage({[BOARD_LAYOUT_KEY]: JSON.stringify(record)});

describe('stored board layout', () => {
    it('round trips placements and folds', () => {
        const storage = fakeStorage();
        let layout = setPlacement(emptyBoardLayout(), 'legend', {kind: 'docked', anchor: 'br', order: 2});
        layout = setPlacement(layout, 'tools', {kind: 'free', x: 10.5, y: -4});
        layout = setFold(layout, 'tools', true);
        expect(saveBoardLayout(layout, storage)).toBe(true);
        expect(loadBoardLayout(storage)).toEqual(layout);
    });

    it('falls back to the empty record on missing or invalid JSON', () => {
        expect(loadBoardLayout(fakeStorage())).toEqual(emptyBoardLayout());
        expect(loadBoardLayout(fakeStorage({[BOARD_LAYOUT_KEY]: '{nope'}))).toEqual(emptyBoardLayout());
        expect(loadBoardLayout(fakeStorage({[BOARD_LAYOUT_KEY]: '[1]'}))).toEqual(emptyBoardLayout());
    });

    it('ignores an unknown or missing version wholesale', () => {
        const body = {placements: {legend: {kind: 'free', x: 1, y: 2}}, folds: {legend: true}};
        expect(loadBoardLayout(withRecord({version: 2, ...body}))).toEqual(emptyBoardLayout());
        expect(loadBoardLayout(withRecord(body))).toEqual(emptyBoardLayout());
    });

    it('drops bad entries one by one and keeps the valid ones', () => {
        const loaded = loadBoardLayout(withRecord({
            version: 1,
            placements: {
                good: {kind: 'docked', anchor: 'tl', order: 0},
                badAnchor: {kind: 'docked', anchor: 'middle', order: 0},
                negOrder: {kind: 'docked', anchor: 'tl', order: -1},
                fracOrder: {kind: 'docked', anchor: 'tl', order: 1.5},
                nanX: {kind: 'free', x: null, y: 3},
                infY: {kind: 'free', x: 1, y: 1e12},
                strX: {kind: 'free', x: '1', y: 3},
                unknownKind: {kind: 'float'},
                notObject: 7,
            },
            folds: {good: false, bad: 'yes'},
        }));
        expect(loaded).toEqual({placements: {good: {kind: 'docked', anchor: 'tl', order: 0}}, folds: {good: false}});
    });

    it('tolerates wrong container shapes', () => {
        expect(loadBoardLayout(withRecord({version: 1, placements: [], folds: 'x'}))).toEqual(emptyBoardLayout());
    });

    it('stores the lesson card\'s placement but never its fold (a fold is the lesson\'s explore mode)', () => {
        const storage = fakeStorage();
        let layout = setPlacement(emptyBoardLayout(), 'lesson', {kind: 'free', x: 1, y: 1});
        layout = setFold(layout, 'lesson', true);
        expect(layout).toEqual({placements: {lesson: {kind: 'free', x: 1, y: 1}}, folds: {}});
        const forced = {placements: {lesson: {kind: 'free', x: 1, y: 1}}, folds: {lesson: true}} as never;
        saveBoardLayout(forced, storage);
        expect(loadBoardLayout(storage)).toEqual({placements: {lesson: {kind: 'free', x: 1, y: 1}}, folds: {}});
    });

    it('reports a storage failure instead of throwing', () => {
        expect(saveBoardLayout(setFold(emptyBoardLayout(), 'tools', true), fakeStorage({}, true))).toBe(false);
        const broken = {...fakeStorage(), getItem: () => { throw new Error('denied'); }} as Storage;
        expect(loadBoardLayout(broken)).toEqual(emptyBoardLayout());
        const noRemove = {...fakeStorage(), removeItem: () => { throw new Error('denied'); }} as Storage;
        expect(resetAll(noRemove)).toEqual(emptyBoardLayout());
    });

    it('resets one card or everything', () => {
        let layout = setPlacement(emptyBoardLayout(), 'a', {kind: 'free', x: 1, y: 2});
        layout = setFold(setPlacement(layout, 'b', {kind: 'docked', anchor: 'tr', order: 0}), 'a', true);
        const one = resetCard(layout, 'a');
        expect(one).toEqual({placements: {b: {kind: 'docked', anchor: 'tr', order: 0}}, folds: {}});
        expect(layout.placements.a).toBeDefined();
        const storage = fakeStorage();
        saveBoardLayout(layout, storage);
        expect(resetAll(storage)).toEqual(emptyBoardLayout());
        expect(storage.getItem(BOARD_LAYOUT_KEY)).toBeNull();
    });
});

describe('stored strip dock', () => {
    it('round-trips every dock and parses junk as absent', () => {
        for (const dock of ['top-centre', 'bottom-left', 'bottom-centre', 'bottom-right', 'left', 'right'] as const) {
            const storage = fakeStorage();
            expect(saveBoardLayout(setStripDock(emptyBoardLayout(), dock), storage)).toBe(true);
            expect(loadBoardLayout(storage).strip).toBe(dock);
        }
        for (const junk of ['top', 'top-left', 3, null, {}, ['left']]) {
            expect(parseBoardLayout({version: BOARD_LAYOUT_VERSION, placements: {}, folds: {}, strip: junk}).strip).toBeUndefined();
        }
        expect(parseBoardLayout({version: BOARD_LAYOUT_VERSION}).strip).toBeUndefined();
    });

    it('survives resetting one card and is cleared by resetting everything', () => {
        const layout = setPlacement(setStripDock(emptyBoardLayout(), 'right'), 'a', {kind: 'free', x: 1, y: 2});
        expect(resetCard(layout, 'a').strip).toBe('right');
        const storage = fakeStorage();
        saveBoardLayout(layout, storage);
        expect(resetAll(storage).strip).toBeUndefined();
        expect(loadBoardLayout(storage).strip).toBeUndefined();
    });
});
