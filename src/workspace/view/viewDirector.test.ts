import {afterEach, describe, expect, test, vi} from 'vitest';
import {ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {ViewAdapter, type ViewBoard, type ViewBox} from '../../graphs/base/writes/viewAdapter';
import {beginLearnerGesture, beginLearnerSpan, runAs} from '../../graphs/base/writes/writeSource';
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import {createAutofitSwitch} from './autofitSwitch';
import {GLIDE_MAX_MS, GLIDE_MS, setStepGlideMs, stepGlideMs} from './motion';
import {directorEligible, glideBox, ViewDirector, type DirectorGeometry} from './viewDirector';

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

interface Rig {board: FakeBoard; adapter: ViewAdapter; arbiter: ParameterArbiter; clock: Scheduler; director: ViewDirector; marks: {current: ViewMarks | undefined}; follow: {current: ViewBox | undefined}; autofit: ReturnType<typeof createAutofitSwitch>}
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
    const follow: {current: ViewBox | undefined} = {current: undefined};
    const director = new ViewDirector({
        adapter, arbiter, marks: () => marks.current, follow: () => follow.current, equalAxisUnits: () => false, now: clock.now,
        requestFrame: clock.request, cancelFrame: clock.cancel, reducedMotion: () => options.reducedMotion ?? false, autofit,
    });
    const made = {board, adapter, arbiter, clock, director, marks, follow, autofit};
    rigs.push(made);
    if (options.geometry !== null) director.setGeometry(options.geometry ?? GEOMETRY);
    return made;
}

afterEach(() => { setStepGlideMs(GLIDE_MS); for (const made of rigs.splice(0)) { made.director.dispose(); made.arbiter.dispose(); made.adapter.dispose(); } live.adapter = 0; live.autofit = 0; });

const settle = (made: Rig) => made.clock.run(GLIDE_MAX_MS + 100);

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

    test('a typed value that moves a must mark far outside the view: one glide after the input ends, to a box containing it, intent unchanged', () => {
        const made = rig({geometry: OPEN});
        settle(made);
        const intent = made.adapter.intent();
        const end = beginLearnerGesture(); // the typed point row's learner input
        made.marks.current = {must: [{kind: 'point', x: 60, y: 45}]};
        made.clock.run(500);
        const before = made.board.writes.length;
        expect(before).toBe(0); // nothing moves under the learner's hand
        end();
        made.clock.run(GLIDE_MAX_MS + 100);
        expect(made.board.writes.length).toBeGreaterThan(before);
        const [left, top, right, bottom] = made.board.box;
        expect(60).toBeGreaterThanOrEqual(left); expect(60).toBeLessThanOrEqual(right);
        expect(45).toBeLessThanOrEqual(top); expect(45).toBeGreaterThanOrEqual(bottom);
        const settled = made.board.writes.length;
        made.clock.run(500);
        expect(made.board.writes).toHaveLength(settled); // one glide, no second
        expect(made.adapter.intent()).toBe(intent);
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

    test('a card change during a frame glide retargets it: one glide, ending at the new target at the original end time', () => {
        const made = rig();
        settle(made);
        const settled = [...made.board.box];
        const t0 = made.clock.time;
        made.director.setGeometry(OPEN);
        made.director.frameChanged();
        made.clock.run(96); // well inside the first glide
        expect(made.arbiter.activeLeases()).toHaveLength(1);
        made.director.setGeometry(GEOMETRY);
        expect(made.clock.pending()).toBe(1);
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.box).toEqual(settled.map(v => expect.closeTo(v, 6)));
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        // The glide began on the first frame (16 ms) and ends one frame after its 250 ms.
        expect(made.clock.time - t0).toBeLessThanOrEqual(16 + stepGlideMs() + 16);
    });

    test('a 3-width pan glides for 450 ms and ends exactly on the target; the step clock follows it', () => {
        const made = rig({geometry: null});
        made.follow.current = INTENT as unknown as ViewBox;
        made.marks.current = {must: []};
        made.director.setGeometry(OPEN);
        settle(made);
        const target: ViewBox = [60, 7.5, 80, -7.5]; // three widths to the right
        made.follow.current = target;
        const t0 = made.clock.time;
        made.director.frameChanged();
        made.clock.run(GLIDE_MS + 16);
        expect(made.board.box).not.toEqual(target);
        expect(stepGlideMs()).toBe(450);
        made.clock.run(450);
        expect(made.board.box).toEqual(target);
        expect(made.clock.time - t0).toBeLessThanOrEqual(16 + 450 + 16);
        expect(made.clock.time - t0).toBeGreaterThan(GLIDE_MS + 16);
    });

    test('a small move keeps 250 ms on the step clock', () => {
        const made = rig({geometry: null});
        made.follow.current = INTENT as unknown as ViewBox;
        made.marks.current = {must: []};
        made.director.setGeometry(OPEN);
        settle(made);
        made.follow.current = [-9.8, 7.5, 10.2, -7.5];
        made.director.frameChanged();
        made.clock.run(32);
        expect(made.board.box).not.toEqual(INTENT);
        expect(stepGlideMs()).toBeLessThan(GLIDE_MS + 10);
    });

    test('a card change after the frame glide ended starts a glide of its own', () => {
        const made = rig();
        settle(made);
        made.director.frameChanged();
        settle(made);
        made.director.setGeometry(OPEN);
        made.clock.run(32);
        expect(made.arbiter.activeLeases()).toHaveLength(1);
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.box).toEqual(INTENT.map(v => expect.closeTo(v, 6)));
    });

    describe('a lesson write while a fit is shown (one glide per step)', () => {
        const maxJump = (a: readonly number[], b: readonly number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

        test('the same intent written again does not show the intent for a frame: the fitted box stays', async () => {
            const made = rig();
            settle(made);
            const fitted = [...made.board.box];
            made.board.writes.length = 0;
            runAs('lesson', () => made.adapter.setIntent(INTENT));
            await Promise.resolve(); // before the next paint
            expect(made.board.box).toEqual(fitted);
            made.director.frameChanged();
            made.clock.run(GLIDE_MS + 100);
            expect(made.board.box).toEqual(fitted);
            expect(made.adapter.fitted()).toEqual(fitted);
            expect(made.arbiter.activeLeases()).toHaveLength(0);
        });

        test('a changed intent glides from the box that was shown, not from the intent', async () => {
            const made = rig();
            settle(made);
            const fitted = [...made.board.box];
            const next = [-5, 4, 5, -4];
            runAs('lesson', () => made.adapter.setIntent(next));
            await Promise.resolve();
            expect(made.board.box).toEqual(fitted);
            made.director.frameChanged();
            made.clock.run(16);
            const first = [...made.board.box];
            expect(maxJump(first, fitted)).toBeLessThan(maxJump(next, fitted) / 2);
            made.clock.run(GLIDE_MS + 100);
            expect(made.board.box).not.toEqual(fitted);
        });

        test('a write that ends the frame glide midway carries it on: no restart, no jump, the original end time', async () => {
            const made = rig();
            settle(made);
            made.director.setGeometry(OPEN);
            made.director.frameChanged();
            made.clock.run(96);
            const mid = [...made.board.box];
            const t0 = made.clock.time;
            runAs('lesson', () => made.adapter.setIntent(INTENT.map(v => v * 0.5)));
            await Promise.resolve();
            expect(made.board.box).toEqual(mid);
            made.clock.run(16);
            expect(maxJump(made.board.box, mid)).toBeLessThan(maxJump(made.adapter.intent().box, mid) / 2);
            made.clock.run(stepGlideMs());
            expect(made.arbiter.activeLeases()).toHaveLength(0);
            expect(made.clock.time - t0).toBeLessThanOrEqual(stepGlideMs() - 96 + 3 * 16 + 1);
        });

        test('the Back and Next click is a learner span: the box is still held through the lesson writes inside it', async () => {
            const made = rig();
            settle(made);
            const fitted = [...made.board.box];
            const end = beginLearnerSpan();
            runAs('lesson', () => made.adapter.setIntent(INTENT));
            await Promise.resolve();
            expect(made.board.box).toEqual(fitted);
            end();
        });

        test('a learner pan in between is not restored', async () => {
            const made = rig();
            settle(made);
            const gesture = beginLearnerGesture();
            made.board.pan(2);
            gesture();
            await Promise.resolve();
            expect(made.board.box).toEqual(made.adapter.intent().box);
            expect(made.arbiter.activeLeases()).toHaveLength(0);
        });
    });

    test('a retarget continues from the box shown: the next frame does not jump', () => {
        const made = rig();
        settle(made);
        made.director.setGeometry(OPEN);
        made.director.frameChanged();
        made.clock.run(96);
        const before = [...made.board.box];
        made.director.setGeometry(GEOMETRY);
        made.clock.run(16);
        // Without a rebase the eased position is taken between the old start and the new end: a jump of several units.
        expect(Math.max(...made.board.box.map((v, i) => Math.abs(v - before[i])))).toBeLessThan(2);
    });
});

describe('a followView (task 07 slice 4)', () => {
    const FIRST: ViewBox = [-4, 3, 4, -3];
    const SECOND: ViewBox = [-2, 1.5, 2, -1.5];
    /** The marks sit inside both boxes, so the keep pass has nothing to do. */
    const CENTRE: ViewMarks = {must: [{kind: 'point', x: 0, y: 0}]};
    /** A rig that follows FIRST with no card in the way, settled. */
    function following(): Rig {
        const made = rig({geometry: null});
        made.follow.current = FIRST;
        made.marks.current = CENTRE;
        made.director.setGeometry(OPEN);
        settle(made);
        return made;
    }
    /** The follow changes as a write of `source` would change it, and the host tells the director. */
    const follows = (made: Rig, box: ViewBox | undefined, source: 'lesson' | 'learner' = 'lesson') =>
        runAs(source, () => { made.follow.current = box; made.director.followChanged(); });

    test('the fit frames the followView, not the stored intent, and never writes the intent', () => {
        const made = following();
        for (let i = 0; i < 3; i++) { follows(made, i % 2 ? FIRST : SECOND); settle(made); }
        follows(made, SECOND);
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));
        expect(made.adapter.intent().box).toEqual(INTENT);
    });

    test('latest writer wins: a lesson view write is the base until the followView changes again', () => {
        const made = following();
        const WRITTEN: ViewBox = [-1, 0.75, 1, -0.75];
        runAs('lesson', () => made.adapter.setIntent(WRITTEN));
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(WRITTEN[index], 6));
        made.director.fitNow(); // the follow did not change: the write still wins
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(WRITTEN[index], 6));
        follows(made, SECOND);
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));
    });

    test('follow moves away then returns to the write\'s box: the follow is the base', () => {
        const made = following();
        const WRITTEN: ViewBox = [-1, 0.75, 1, -0.75];
        runAs('lesson', () => made.adapter.setIntent(WRITTEN)); // wins while the follow is FIRST
        settle(made);
        follows(made, SECOND);
        settle(made);
        follows(made, FIRST); // back at the box the write saw
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(FIRST[index], 6));
        runAs('lesson', () => made.adapter.setIntent(WRITTEN)); // a Reset restating the same intent revives no old win
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(FIRST[index], 6));
    });

    test('the fit button after a learner pan fits the follow, or a lesson write that won since', () => {
        const made = following();
        runAs('learner', () => made.adapter.navigating(() => made.adapter.setIntent([-9, 7.5, 11, -7.5])));
        expect(made.director.isPaused()).toBe(true);
        made.director.fitNow();
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(FIRST[index], 6));
        const WRITTEN: ViewBox = [-1, 0.75, 1, -0.75];
        runAs('learner', () => made.adapter.navigating(() => made.adapter.setIntent([-9, 7.5, 11, -7.5])));
        runAs('lesson', () => made.adapter.setIntent(WRITTEN));
        made.director.fitNow();
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(WRITTEN[index], 6));
    });

    test('a step that writes the default view and then the intent it already had (Back, a restated scene) does not win over the follow', () => {
        const made = following();
        const WRITTEN: ViewBox = [-1, 0.75, 1, -0.75];
        runAs('lesson', () => made.adapter.setIntent(WRITTEN));
        settle(made);
        follows(made, SECOND);
        settle(made);
        runAs('lesson', () => { made.adapter.setIntent(INTENT); made.adapter.setIntent(WRITTEN); }); // one tick: net no move
        settle(made);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));
    });

    test('a change from a non-learner write (lesson step, animation) glides once to the new base', () => {
        const made = following();
        made.board.writes.length = 0;
        follows(made, SECOND);
        made.clock.run(64);
        expect(made.board.box[0]).toBeGreaterThan(FIRST[0]); // it started
        expect(made.board.box[0]).toBeLessThan(SECOND[0]); // and has not arrived
        made.clock.run(GLIDE_MS + 100);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));
        const lefts = made.board.writes.map(box => box[0]);
        expect(lefts.length).toBeGreaterThan(3);
        lefts.forEach((left, index) => { if (index > 0) expect(left).toBeGreaterThanOrEqual(lefts[index - 1]); }); // one glide: no restart, no jump back
        expect(made.arbiter.activeLeases()).toHaveLength(0);
    });

    test('a follow that did not move writes nothing, also within the tolerance of 1e-9', () => {
        const made = following();
        made.board.writes.length = 0;
        follows(made, FIRST);
        follows(made, [FIRST[0] + 1e-12, FIRST[1], FIRST[2], FIRST[3]]);
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(0);
    });

    test('two fits of an unchanged state write once', () => {
        const made = following();
        made.board.writes.length = 0;
        follows(made, SECOND);
        made.director.fitNow(); // a second request for the same target, before the glide ran
        made.clock.run(GLIDE_MS + 100);
        const afterFirst = made.board.writes.length;
        made.director.fitNow();
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(afterFirst);
        expect(made.board.writes.at(-1)!.every((value, index) => Math.abs(value - SECOND[index]) < 1e-6)).toBe(true);
    });

    test('a learner pan pauses it: later changes do nothing until the fit button', () => {
        const made = following();
        const gesture = beginLearnerGesture();
        made.board.pan(0.5);
        gesture();
        expect(made.director.isPaused()).toBe(true);
        const panned = [...made.board.box];
        made.board.writes.length = 0;
        follows(made, SECOND);
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(0);
        expect(made.board.box).toEqual(panned);
        made.director.fitNow();
        made.clock.run(GLIDE_MS + 100);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));
    });

    test('a learner write that moves it glides at the gesture end, and only with Samodejno on', () => {
        const made = following();
        const end = beginLearnerGesture();
        follows(made, SECOND, 'learner');
        made.board.writes.length = 0;
        made.clock.run(GLIDE_MS + 100);
        expect(made.board.writes).toHaveLength(0); // nothing moves under the learner's hand
        end();
        made.clock.run(GLIDE_MS + 100);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));

        const off = following();
        off.autofit.set(false);
        const endOff = beginLearnerGesture();
        follows(off, SECOND, 'learner');
        off.board.writes.length = 0;
        endOff();
        off.clock.run(GLIDE_MS + 100);
        expect(off.board.writes).toHaveLength(0);
    });

    test('with reduced motion it jumps', () => {
        const made = rig({geometry: null, reducedMotion: true});
        made.follow.current = FIRST;
        made.marks.current = CENTRE;
        made.director.setGeometry(OPEN);
        settle(made);
        made.board.writes.length = 0;
        follows(made, SECOND);
        made.clock.run(16);
        expect(made.board.writes).toHaveLength(1);
        made.board.box.forEach((value, index) => expect(value).toBeCloseTo(SECOND[index], 6));
    });

    test('the keep pass runs on top: a must mark under a card is cleared in the followed box', () => {
        const made = rig({geometry: null});
        made.follow.current = [-10, 7.5, 10, -7.5];
        made.director.setGeometry(GEOMETRY);
        settle(made);
        const shown = made.board.box;
        const px = (-8 - shown[0]) / (shown[2] - shown[0]) * CANVAS.width;
        expect(px).toBeGreaterThan(290);
        expect(made.adapter.intent().box).toEqual(INTENT);
    });
});

describe('the glide shape', () => {
    test('a 4x zoom-out changes the width evenly per 16 ms frame (linear interpolation jumps most of it first)', () => {
        const from: ViewBox = [-2, 2, 2, -2];
        const to: ViewBox = [-8, 8, 8, -8];
        let previous = 4;
        let largest = 0;
        let largestLinear = 0;
        let previousLinear = 4;
        for (let ms = 16; ms <= GLIDE_MS; ms += 16) {
            const t = Math.min(1, ms / GLIDE_MS);
            const k = 1 - Math.pow(1 - t, 3);
            const box = glideBox(from, to, k);
            const width = box[2] - box[0];
            largest = Math.max(largest, width / previous);
            previous = width;
            const linear = 4 + 12 * k;
            largestLinear = Math.max(largestLinear, linear / previousLinear);
            previousLinear = linear;
        }
        expect(largestLinear).toBeGreaterThan(1.5);
        expect(largest).toBeLessThan(1.4);
        expect(glideBox(from, to, 1)[2] - glideBox(from, to, 1)[0]).toBeCloseTo(16);
    });

    test('a zero or sign-changing size falls back to linear interpolation', () => {
        const box = glideBox([0, 1, 0, -1], [-1, 1, 1, -1], 0.5);
        expect(box.every(Number.isFinite)).toBe(true);
        expect(box[2] - box[0]).toBeCloseTo(1);
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
