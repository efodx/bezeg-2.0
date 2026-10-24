import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

type TestMathJax = {
    startup: {promise: Promise<void>};
    typesetClear: ReturnType<typeof vi.fn>;
    typesetPromise: ReturnType<typeof vi.fn>;
};

function setMathJax(startup: Promise<void> = Promise.resolve()) {
    const api: TestMathJax = {
        startup: {promise: startup},
        typesetClear: vi.fn(),
        typesetPromise: vi.fn().mockResolvedValue(undefined),
    };
    (window as Window & {MathJax?: TestMathJax}).MathJax = api;
    return api;
}

describe('on-demand MathJax loading', () => {
    beforeEach(() => {
        vi.resetModules();
        delete (window as Window & {MathJax?: TestMathJax}).MathJax;
        document.getElementById('MathJax-script')?.remove();
    });

    afterEach(() => {
        vi.useRealTimers();
        document.getElementById('MathJax-script')?.remove();
        delete (window as Window & {MathJax?: TestMathJax}).MathJax;
    });

    test('shares one script request and waits for MathJax startup', async () => {
        const {loadMathJax} = await import('./loadMathJax');
        const first = loadMathJax();
        const second = loadMathJax();
        expect(second).toBe(first);
        const script = document.getElementById('MathJax-script')!;
        expect(document.querySelectorAll('#MathJax-script')).toHaveLength(1);

        let finishStartup: (() => void) | undefined;
        const api = setMathJax(new Promise<void>(resolve => { finishStartup = resolve; }));
        script.dispatchEvent(new Event('load'));
        let settled = false;
        void first.then(() => { settled = true; });
        await Promise.resolve();
        expect(settled).toBe(false);
        finishStartup!();
        await expect(first).resolves.toBe(api);
    });

    test('removes a failed request and permits a later request to succeed', async () => {
        const {loadMathJax} = await import('./loadMathJax');
        const first = loadMathJax();
        const failedScript = document.getElementById('MathJax-script')!;
        failedScript.dispatchEvent(new Event('error'));
        await expect(first).rejects.toThrow(/failed to load/);
        expect(document.getElementById('MathJax-script')).toBeNull();

        const retry = loadMathJax();
        const retryScript = document.getElementById('MathJax-script')!;
        expect(retryScript).not.toBe(failedScript);
        const api = setMathJax();
        retryScript.dispatchEvent(new Event('load'));
        await expect(retry).resolves.toBe(api);
    });

    test('clears a rejected startup and bounds a stalled startup before retrying', async () => {
        const {loadMathJax} = await import('./loadMathJax');
        let rejectStartup: ((error: Error) => void) | undefined;
        const rejectedStartup = new Promise<void>((_, reject) => { rejectStartup = reject; });
        setMathJax(rejectedStartup);
        const failedStartup = loadMathJax();
        const failedStartupAssertion = expect(failedStartup).rejects.toThrow('startup rejected');
        rejectStartup!(new Error('startup rejected'));
        await failedStartupAssertion;
        expect((window as Window & {MathJax?: TestMathJax}).MathJax).toBeUndefined();

        vi.useFakeTimers();
        let leaveStartupPending: (() => void) | undefined;
        setMathJax(new Promise<void>(resolve => { leaveStartupPending = resolve; }));
        const stalled = loadMathJax();
        const stalledAssertion = expect(stalled).rejects.toThrow('MathJax startup timed out');
        await vi.advanceTimersByTimeAsync(15000);
        await stalledAssertion;
        leaveStartupPending!();

        const retry = loadMathJax();
        const script = document.getElementById('MathJax-script')!;
        const api = setMathJax();
        script.dispatchEvent(new Event('load'));
        await expect(retry).resolves.toBe(api);
    });

    test('does not typeset after its surface unmounts while loading', async () => {
        const {typesetMath} = await import('./loadMathJax');
        let active = true;
        const element = document.createElement('div');
        const pending = typesetMath(element, () => active);
        const script = document.getElementById('MathJax-script')!;
        const api = setMathJax();
        active = false;
        script.dispatchEvent(new Event('load'));
        await pending;
        expect(api.typesetClear).not.toHaveBeenCalled();
        expect(api.typesetPromise).not.toHaveBeenCalled();
    });
});
