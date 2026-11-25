import {afterEach, describe, expect, test, vi} from 'vitest';
import {capture, MAX_REVEALED_OBJECTS, reveal, SceneReveal, type RevealBoard, type RevealObject} from './sceneReveal';
import {GLIDE_MS} from './motion';

class Scheduler {
    time = 0;
    private next = 1;
    private callbacks = new Map<number, () => void>();
    request = (callback: () => void) => { const id = this.next++; this.callbacks.set(id, callback); return id; };
    cancel = (id: number) => { this.callbacks.delete(id); };
    now = () => this.time;
    pending() { return this.callbacks.size; }
    frame(ms = 16) {
        this.time += ms;
        for (const [id, callback] of [...this.callbacks.entries()]) { this.callbacks.delete(id); callback(); }
    }
}

const SVG = 'http://www.w3.org/2000/svg';

interface Fake extends RevealObject {
    visPropCalc: {visible: boolean};
}

class Rig {
    clock = new Scheduler();
    container = document.createElement('div');
    svg = document.createElementNS(SVG, 'svg');
    objects: Fake[] = [];
    board: RevealBoard = {objectsList: this.objects, containerObj: this.container};
    constructor() {
        this.container.appendChild(this.svg);
        document.body.appendChild(this.container);
    }
    add(id: string, visible: boolean): Fake {
        const node = document.createElementNS(SVG, 'path');
        node.setAttribute('d', `M0 0 L${id.length} 1`);
        this.svg.appendChild(node);
        const object: Fake = {id, rendNode: node, visPropCalc: {visible}};
        this.objects.push(object);
        return object;
    }
    deps = () => ({now: this.clock.now, requestFrame: this.clock.request, cancelFrame: this.clock.cancel});
    opacity(object: RevealObject) { return (object.rendNode as SVGElement).style.opacity; }
    ghosts() { return this.container.querySelectorAll('.scene-reveal'); }
    destroy() { this.container.remove(); }
}

const rigs: Rig[] = [];
const rig = () => { const made = new Rig(); rigs.push(made); return made; };
afterEach(() => { for (const made of rigs.splice(0)) made.destroy(); });

describe('the scene reveal', () => {
    test('an appearing object fades from 0 to its own opacity over the glide and ends with no inline opacity', () => {
        const r = rig();
        const stays = r.add('stays', true);
        const comes = r.add('comes', false);
        const before = capture(r.board, r.clock.now)!;
        comes.visPropCalc.visible = true;
        const handle = reveal(r.board, before, r.deps())!;
        expect(handle).toBeDefined();
        expect(r.opacity(comes)).toBe('0');
        expect(r.opacity(stays)).toBe('');
        r.clock.frame(GLIDE_MS / 2);
        const middle = Number(r.opacity(comes));
        expect(middle).toBeGreaterThan(0.5);
        expect(middle).toBeLessThan(1);
        r.clock.frame(GLIDE_MS / 2);
        expect(r.opacity(comes)).toBe('');
        expect(r.clock.pending()).toBe(0);
    });

    test('a vanishing object is a clone in the overlay that fades from 0.5 and is gone by the glide duration', () => {
        const r = rig();
        const goes = r.add('goes', true);
        const before = capture(r.board, r.clock.now)!;
        goes.visPropCalc.visible = false;
        reveal(r.board, before, r.deps());
        const [overlay] = r.ghosts() as unknown as HTMLElement[];
        expect(overlay.getAttribute('aria-hidden')).toBe('true');
        expect(overlay.style.pointerEvents).toBe('none');
        expect(overlay.querySelector('path')).not.toBe(goes.rendNode);
        expect(overlay.querySelector('path')!.getAttribute('d')).toBe(goes.rendNode!.getAttribute('d'));
        expect(Number(overlay.style.opacity)).toBeCloseTo(0.5);
        r.clock.frame(GLIDE_MS / 2);
        expect(Number(overlay.style.opacity)).toBeCloseTo(0.25);
        r.clock.frame(GLIDE_MS / 2);
        expect(r.ghosts().length).toBe(0);
    });

    test('a press finishes appearing objects and ghosts at once', () => {
        const r = rig();
        const goes = r.add('goes', true);
        const comes = r.add('comes', false);
        const before = capture(r.board, r.clock.now)!;
        goes.visPropCalc.visible = false;
        comes.visPropCalc.visible = true;
        reveal(r.board, before, r.deps());
        r.clock.frame(16);
        document.body.dispatchEvent(new Event('pointerdown', {bubbles: true}));
        expect(r.opacity(comes)).toBe('');
        expect(r.ghosts().length).toBe(0);
        expect(r.clock.pending()).toBe(0);
    });

    test('a new step finishes the running reveal before looking at the board', () => {
        const r = rig();
        const goes = r.add('goes', true);
        const owner = new SceneReveal({board: () => r.board, ...r.deps(), reducedMotion: () => false});
        const pending = owner.begin()!;
        goes.visPropCalc.visible = false;
        pending.commit();
        expect(r.ghosts().length).toBe(1);
        owner.begin();
        expect(r.ghosts().length).toBe(0);
        expect(owner.isRunning()).toBe(false);
        owner.dispose();
    });

    test('dispose leaves no overlay, frame or listener', () => {
        const r = rig();
        const goes = r.add('goes', true);
        const comes = r.add('comes', false);
        const owner = new SceneReveal({board: () => r.board, ...r.deps(), reducedMotion: () => false});
        const pending = owner.begin()!;
        goes.visPropCalc.visible = false;
        comes.visPropCalc.visible = true;
        pending.commit();
        expect(r.clock.pending()).toBe(1);
        const removed = new Set<string>();
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        owner.dispose();
        for (const call of removeSpy.mock.calls) removed.add(call[0]);
        removeSpy.mockRestore();
        expect([...removed].sort()).toEqual(['keydown', 'pointerdown']);
        expect(r.ghosts().length).toBe(0);
        expect(r.clock.pending()).toBe(0);
        expect(r.opacity(comes)).toBe('');
        // a listener left behind would finish (and throw into) nothing, so check that the commit after dispose is inert instead
        pending.commit();
        expect(r.ghosts().length).toBe(0);
        expect(r.clock.pending()).toBe(0);
    });

    test('reduced motion and a missing board (a surface) do nothing', () => {
        const r = rig();
        r.add('goes', true);
        expect(new SceneReveal({board: () => r.board, ...r.deps(), reducedMotion: () => true}).begin()).toBeUndefined();
        expect(new SceneReveal({board: () => undefined, ...r.deps(), reducedMotion: () => false}).begin()).toBeUndefined();
    });

    test('an expensive capture or a large diff is skipped', () => {
        const slow = rig();
        slow.add('a', true);
        let ticks = 0;
        expect(capture(slow.board, () => (ticks += 20))).toBeUndefined();
        const big = rig();
        const items = Array.from({length: MAX_REVEALED_OBJECTS + 1}, (_, index) => big.add(`o${index}`, false));
        const before = capture(big.board, big.clock.now)!;
        for (const item of items) item.visPropCalc.visible = true;
        expect(reveal(big.board, before, big.deps())).toBeUndefined();
        expect(big.opacity(items[0])).toBe('');
    });

    test('nothing changed starts nothing', () => {
        const r = rig();
        r.add('same', true);
        const before = capture(r.board, r.clock.now)!;
        expect(reveal(r.board, before, r.deps())).toBeUndefined();
        expect(r.clock.pending()).toBe(0);
    });
});
