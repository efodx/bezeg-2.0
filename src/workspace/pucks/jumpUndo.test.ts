import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createJumpUndo, UNDO_MS} from './jumpUndo';

describe('jump undo controller', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });
    const make = () => {
        const write = vi.fn();
        const controller = createJumpUndo(() => write, {set: (cb, ms) => setTimeout(cb, ms), clear: h => clearTimeout(h as ReturnType<typeof setTimeout>)});
        return {write, controller};
    };

    it('is open for 4 s and then gone', () => {
        const {controller} = make();
        controller.offer(3);
        expect(UNDO_MS).toBe(4000);
        expect(controller.pending()).toBe(3);
        vi.advanceTimersByTime(3999);
        expect(controller.pending()).toBe(3);
        vi.advanceTimersByTime(1);
        expect(controller.pending()).toBeUndefined();
    });

    it('undo writes the previous value once and closes', () => {
        const {controller, write} = make();
        controller.offer(3);
        controller.undo();
        controller.undo();
        expect(write).toHaveBeenCalledExactlyOnceWith(3);
        expect(controller.pending()).toBeUndefined();
    });

    it('a newer jump restarts the window and replaces the offer', () => {
        const {controller} = make();
        controller.offer(1);
        vi.advanceTimersByTime(3000);
        controller.offer(2);
        vi.advanceTimersByTime(3000);
        expect(controller.pending()).toBe(2);
        vi.advanceTimersByTime(1000);
        expect(controller.pending()).toBeUndefined();
    });

    it('dismiss ends the offer without writing and tells listeners', () => {
        const {controller, write} = make();
        const listener = vi.fn();
        controller.subscribe(listener);
        controller.offer(1);
        controller.dismiss();
        expect(write).not.toHaveBeenCalled();
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
