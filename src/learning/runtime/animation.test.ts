import {AnimationDriver, AnimationScheduler} from './animation';

function scheduler() {
    let nextHandle = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const value: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    return {value, callbacks};
}

test('animation driver pauses, replays, and cancels pending frames on dispose', () => {
    const frames = scheduler();
    const onFrame = vi.fn();
    const driver = new AnimationDriver(onFrame, frames.value);
    driver.play();
    const consume = (time: number) => {
        const entry = frames.callbacks.entries().next().value as [number, FrameRequestCallback];
        frames.callbacks.delete(entry[0]);
        entry[1](time);
    };
    consume(10);
    consume(26);
    expect(onFrame).toHaveBeenLastCalledWith(16, 26);
    driver.pause();
    expect(frames.callbacks.size).toBe(0);
    driver.replay();
    expect(frames.callbacks.size).toBe(1);
    driver.dispose();
    expect(frames.callbacks.size).toBe(0);
    expect(driver.isRunning()).toBe(false);
});
