import {afterEach, describe, expect, test, vi} from 'vitest';
import {ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {ViewAdapter, type ViewBoard} from '../../graphs/base/writes/viewAdapter';
import {beginLearnerGesture, beginLearnerSpan, runAs} from '../../graphs/base/writes/writeSource';
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import {createAutofitSwitch} from './autofitSwitch';
import {directorEligible, GLIDE_MS, ViewDirector, type DirectorGeometry} from './viewDirector';

/** A board that fires `boundingbox` on every change, as JSXGraph does, and counts what is shown. */
class FakeBoard implements ViewBoard {
    box: number[];
    writes: number[][] = [];
    private handlers = new Set<() => void>();
    constructor(box: number[]) { this.box = [...box]; }
    getBoundingBox() { return [...this.box]; }
    setBoundingBox(box: number[]) { this.box = [...box]; this.writes.push([...box]); this.handlers.forEach(h => h()); return undefined; }
    on(_event: 'boundingbox', handler: () => void) { this.handlers.add(handler); }
    off(_event: 'boundingbox', handler: () => void) { this.handlers.delete(handler); }
    handlerCount() { return this.handlers.size; }
    /** The learner's pan: the library changes the box and fires its event. */
    pan(dx: number) { this.box = [this.box[0] + dx, this.box[1], this.box[2] + dx, this.box[3]]; this.handlers.forEach(h => h()); }
}

/** Frames run by hand under a fake clock. */
class Scheduler {
    time = 0;
    private next = 1;
    private callbacks = new Map<number, () => void>();
    request = (callback: () => void) => { const id = this.next++; this.callbacks.set(id, callback); return id; };
    cancel = (id: number) => { this.callbacks.delete(id); };
    now = () => this.time;
    pending() { return this.callbacks.size; }
    /** Runs the frames of `ms` of fake time, one every 16 ms, then the frames still due. */
    run(ms: number) {
        const end = this.time + ms;
        while (this.callbacks.size > 0 && this.time < end) {
            this.time = Math.min(end, this.time + 16);
            for (const [id, callback] of [...this.callbacks.entries()]) { this.callbacks.delete(id); callback(); }
        }
    }
}

const CANVAS = {width: 800, height: 600};
// A card on the left covers the world point (-8, 0) in the intent box, so the fit has to move the view.
const GEOMETRY: DirectorGeometry = {canvas: CANVAS, free: {x: 300, y: 0, width: 500, height: 600}, obstacles: [{x: 0, y: 0, width: 290, height: 600}]};
const OPEN: DirectorGeometry = {canvas: CANVAS, free: {x: 0, y: 0, width: 800, height: 600}, obstacles: []};
const MARKS: ViewMarks = {must: [{kind: 'point', x: -8, y: 0}]};
const INTENT = [-10, 7.5, 10, -7.5];

interface Rig {board: FakeBoard; adapter: ViewAdapter; arbiter: ParameterArbiter; clock: Scheduler; director: ViewDirector; marks: {current: ViewMarks | undefined}; autofit: ReturnType<typeof createAutofitSwitch>}
const rigs: Rig[] = [];
const live = {adapter: 0, autofit: 0};

function rig(options: {reducedMotion?: boolean; geometry?: DirectorGeometry | null} = {}): Rig {
    const board = new FakeBoard(INTENT);
    const adapter = new ViewAdapter(board);
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true});
    adapter.bindTo(arbiter, 'view');
    const clock = new Scheduler();
    // Count what the director subscribes to, so a disposal that forgets one is seen.
    const subscribeAdapter = adapter.subscribe.bind(adapter);
    adapter.subscribe = listener => { live.adapter++; const stop = subscribeAdapter(listener); return () => { live.adapter--; stop(); }; };
    const marks: {current: ViewMarks | undefined} = {current: MARKS};
    const store = new Map<string, string>();
    const autofit = createAutofitSwitch(() => ({getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); }}));
    const subscribeAutofit = autofit.subscribe;
    autofit.subscribe = listener => { live.autofit++; const stop = subscribeAutofit(listener); return () => { live.autofit--; stop(); }; };
    const director = new ViewDirector({
        adapter, arbiter, marks: () => marks.current, equalAxisUnits: () => false, now: clock.now,
        requestFrame: clock.request, cancelFrame: clock.cancel, reducedMotion: () => options.reducedMotion ?? false, autofit,
    });
    const made = {board, adapter, arbiter, clock, director, marks, autofit};
    rigs.push(made);
    if (options.geometry !== null) director.setGeometry(options.geometry ?? GEOMETRY);
    return made;
}

afterEach(() => { for (const made of rigs.splice(0)) { made.director.dispose(); made.arbiter.dispose(); made.adapter.dispose(); } live.adapter = 0; live.autofit = 0; });

const settle = (made: Rig) => made.clock.run(GLIDE_MS + 100);

describe('the view director', () => {
    test('the load fit jumps once and shows a box that clears the card, leaving the intent alone', () => {
        const made = rig();
        made.clock.run(16);
        expect(made.board.writes).toHaveLength(1);
        const fitted = made.adapter.fitted()!;
        expect(made.board.box).toEqual(fitted);
        // The expansion point (-8, 0) is now right of the card edge (290 px).
        const px = (-8 - fitted[0]) / (fitted[2] - fitted[0]) * CANVAS.width;
        expect(px).toBeGreaterThan(290);
        expect(made.adapter.intent().box).toEqual(INTENT);
    });

    test('a fit never changes the intent', () => {
        const made = rig();
        const before = made.adapter.intent();
        settle(made);
        made.director.setGeometry(OPEN);
        settle(made);
        made.director.setGeometry(GEOMETRY);
        settle(made);
        expect(made.adapter.intent()).toBe(before);
        expect(made.adapter.fitted()).toBeDefined();
    });

    test('a card change glides: ease-out, in steps, from the shown box to the target, one write per frame', () => {
        const made = rig();
        settle(made);
        const shown = [...made.board.box];
        made.board.writes.length = 0;
        made.director.setGeometry(OPEN);
        made.clock.run(GLIDE_MS + 100);
        const steps = made.board.writes;
        expect(steps.length).toBeGreaterThan(3);
        expect(steps[steps.length - 1]).toEqual(INTENT.map(v => expect.closeTo(v, 6)));
        const travelled = steps.map(step => Math.abs(step[0] - shown[0]));
        for (let i = 1; i < travelled.length; i++) expect(travelled[i]).toBeGreaterThanOrEqual(travelled[i - 1]);
        // ease-out: the first half of the time covers more than half of the distance
        const total = travelled[travelled.length - 1];
        expect(travelled[Math.floor(travelled.length / 2) - 1]).toBeGreaterThan(total / 2);
    });

    test('two fits of an unchanged state write once and return the same box', () => {
        const made = rig();
        settle(made);
        const box = made.adapter.fitted();
        made.board.writes.length = 0;
        made.director.setGeometry({...GEOMETRY, free: {...GEOMETRY.free, x: GEOMETRY.free.x + 0.4}}); // within 1 px: no change
        made.director.fitNow();
        settle(made);
        made.director.fitNow();
        settle(made);
        expect(made.board.writes).toHaveLength(0);
        expect(made.adapter.fitted()).toEqual(box);
    });

    test('a learner pan during a glide ends it; the view and the intent are the learner\'s and later triggers do nothing until the fit button', () => {
        const made = rig();
        settle(made);
        made.director.setGeometry(OPEN);
        made.clock.run(64); // mid-glide
        expect(made.board.writes.length).toBeGreaterThan(0);
        const gesture = beginLearnerGesture();
        made.board.pan(1.5);
        gesture();
        const panned = [...made.board.box];
        expect(made.adapter.intent().box).toEqual(panned);
        expect(made.adapter.fitted()).toBeUndefined();
        expect(made.director.isPaused()).toBe(true);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        made.board.writes.length = 0;
        made.clock.run(GLIDE_MS + 100);
        made.director.setGeometry(GEOMETRY);
        made.director.resized();
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(0);
        expect(made.board.box).toEqual(panned);
        made.director.fitNow();
        settle(made);
        expect(made.director.isPaused()).toBe(false);
        expect(made.board.writes.length).toBeGreaterThan(0);
        expect(made.adapter.intent().box).toEqual(panned); // the fit button still never writes the intent
    });

    test('an arrow pauses; a learner Reset-like intent write resumes and glides', () => {
        const made = rig();
        settle(made);
        runAs('learner', () => made.adapter.navigating(() => made.adapter.setIntent([-9, 7.5, 11, -7.5])));
        expect(made.director.isPaused()).toBe(true);
        runAs('learner', () => made.adapter.setIntent([-10, 7.5, 10, -7.5])); // Reset
        expect(made.director.isPaused()).toBe(false);
        made.board.writes.length = 0;
        settle(made);
        expect(made.adapter.fitted()).toBeDefined();
        expect(made.board.writes.length).toBeGreaterThan(0);
    });

    test('Escape (endAllLeases learner) mid-glide ends the glide without pausing; a later card change refits', () => {
        const made = rig();
        settle(made);
        made.director.setGeometry(OPEN);
        made.clock.run(64); // mid-glide
        expect(made.arbiter.activeLeases()).toHaveLength(1);
        made.arbiter.endAllLeases('learner');
        expect(made.director.isPaused()).toBe(false);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        made.board.writes.length = 0;
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(0); // the glide is over
        made.director.setGeometry(GEOMETRY);
        settle(made);
        expect(made.board.writes.length).toBeGreaterThan(0);
    });

    test('a navigation change pauses', () => {
        const made = rig();
        settle(made);
        runAs('learner', () => made.adapter.navigating(() => made.adapter.setIntent([-9, 7.5, 11, -7.5])));
        expect(made.director.isPaused()).toBe(true);
    });

    test('disposal mid-glide shows the intent again, leaving the intent and listeners alone', () => {
        const made = rig();
        settle(made);
        made.director.setGeometry(OPEN);
        made.clock.run(64);
        expect(made.adapter.fitted()).toBeDefined();
        const intent = made.adapter.intent();
        const changes: unknown[] = [];
        made.adapter.subscribe(change => changes.push(change));
        made.director.dispose();
        expect(made.adapter.fitted()).toBeUndefined();
        expect(made.board.box).toEqual(INTENT);
        expect(made.adapter.intent()).toBe(intent);
        expect(changes).toHaveLength(0);
    });

    test('marks are compared by identity first: the same object is not serialized again, a changed one is', () => {
        const made = rig();
        settle(made);
        const stringify = vi.spyOn(JSON, 'stringify');
        beginLearnerGesture()();
        expect(stringify).not.toHaveBeenCalled();
        made.marks.current = {must: [{kind: 'point', x: -9, y: 0}]};
        beginLearnerGesture()();
        expect(stringify).toHaveBeenCalled();
        stringify.mockRestore();
    });

    test('a new lesson frame ends a pause', () => {
        const made = rig();
        settle(made);
        const gesture = beginLearnerGesture();
        made.board.pan(2);
        gesture();
        expect(made.director.isPaused()).toBe(true);
        made.director.frameChanged();
        settle(made);
        expect(made.director.isPaused()).toBe(false);
        expect(made.adapter.fitted()).toBeDefined();
    });

    test('no write while a learner span is open; exactly one fit at its end', () => {
        const made = rig({geometry: null});
        const end = beginLearnerSpan();
        made.director.setGeometry(GEOMETRY);
        made.director.frameChanged();
        made.clock.run(500);
        expect(made.board.writes).toHaveLength(0);
        end();
        made.clock.run(GLIDE_MS + 100);
        const written = made.board.writes.length;
        expect(written).toBeGreaterThan(0);
        made.clock.run(500);
        expect(made.board.writes).toHaveLength(written);
        expect(made.adapter.fitted()).toBeDefined();
    });

    test('a card drag defers the fit to the drop', () => {
        const made = rig({geometry: null});
        made.director.setDragging(true);
        made.director.setGeometry(GEOMETRY);
        made.clock.run(500);
        expect(made.board.writes).toHaveLength(0);
        made.director.setDragging(false);
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes.length).toBeGreaterThan(0);
    });

    test('a resize jumps in one write', () => {
        const made = rig();
        settle(made);
        made.board.writes.length = 0;
        made.director.setGeometry({canvas: {width: 700, height: 600}, free: {x: 300, y: 0, width: 400, height: 600}, obstacles: GEOMETRY.obstacles});
        made.director.resized();
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(1);
    });

    test('reduced motion: one write per fit', () => {
        const made = rig({reducedMotion: true});
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(1);
        made.director.setGeometry(OPEN);
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(2);
    });

    test('a lesson intent change refits from the new intent', () => {
        const made = rig();
        settle(made);
        made.board.writes.length = 0;
        runAs('lesson', () => made.adapter.setIntent([-5, 4, 5, -4]));
        made.clock.run(GLIDE_MS + 100);
        expect(made.director.isPaused()).toBe(false);
        expect(made.adapter.intent().box).toEqual([-5, 4, 5, -4]);
        expect(made.adapter.fitted()).toBeDefined();
        expect(made.board.writes.length).toBeGreaterThan(1);
    });

    test('Samodejno off: no automatic fit; the fit button still fits', () => {
        const made = rig({geometry: null});
        made.autofit.set(false);
        made.director.setGeometry(GEOMETRY);
        made.director.frameChanged();
        made.clock.run(500);
        expect(made.board.writes).toHaveLength(0);
        made.director.fitNow();
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes.length).toBeGreaterThan(0);
        expect(made.adapter.fitted()).toBeDefined();
    });

    test('a released parameter refits only when a must mark is covered in the shown view', () => {
        const made = rig({geometry: OPEN});
        settle(made);
        made.board.writes.length = 0;
        // A released parameter that moves the mark to a visible, uncovered place: no refit.
        made.marks.current = {must: [{kind: 'point', x: 5, y: 0}]};
        let end = beginLearnerGesture();
        end();
        expect(made.clock.pending()).toBe(0); // nothing was even scheduled
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(0);
        // One that moves it off the board: refit.
        made.marks.current = {must: [{kind: 'point', x: 14, y: 0}]};
        end = beginLearnerGesture();
        end();
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes.length).toBeGreaterThan(0);
    });

    test('disposal leaves no frame callback, lease or subscription', () => {
        const made = rig();
        made.clock.run(16);
        made.director.setGeometry(OPEN); // a glide is under way
        made.clock.run(32);
        expect(live).toEqual({adapter: 1, autofit: 1});
        made.director.dispose();
        expect(live).toEqual({adapter: 0, autofit: 0});
        expect(made.clock.pending()).toBe(0);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        made.board.writes.length = 0;
        runAs('lesson', () => made.adapter.setIntent([-5, 4, 5, -4]));
        const end = beginLearnerGesture();
        end();
        made.director.frameChanged();
        made.director.resized();
        made.director.fitNow();
        made.autofit.set(false);
        made.autofit.set(true);
        expect(made.clock.pending()).toBe(0);
        expect(() => made.director.dispose()).not.toThrow();
    });
});

describe('the gate', () => {
    test('a director needs marks, a bound view and a non-surface demonstration', () => {
        expect(directorEligible({marks: MARKS, boundKeys: ['view'], surface: false})).toBe(true);
        expect(directorEligible({marks: undefined, boundKeys: ['view'], surface: false})).toBe(false);
        expect(directorEligible({marks: MARKS, boundKeys: ['view'], surface: true})).toBe(false);
        expect(directorEligible({marks: MARKS, boundKeys: ['taylor-x'], surface: false})).toBe(false);
        expect(directorEligible({marks: MARKS, boundKeys: undefined, surface: false})).toBe(false);
    });
});

describe('the Samodejno switch', () => {
    test('defaults to on, stores the choice and survives a storage that throws', () => {
        const store = new Map<string, string>();
        const working = createAutofitSwitch(() => ({getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); }}));
        expect(working.get()).toBe(true);
        working.set(false);
        expect(store.get('bezeg.view.autofit')).toBe('off');
        expect(createAutofitSwitch(() => ({getItem: key => store.get(key) ?? null, setItem: () => undefined})).get()).toBe(false);
        const broken = createAutofitSwitch(() => ({getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }}));
        expect(broken.get()).toBe(true);
        broken.set(false);
        expect(broken.get()).toBe(false);
    });
});
