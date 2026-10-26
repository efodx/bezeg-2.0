import {afterEach, describe, expect, it, vi} from 'vitest';
import {rememberGuidedExampleReading, restoreGuidedExampleReading} from './guidedExampleReading';

describe('guided-example reading bookmark', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('restores section-relative scroll and focus to the invoking example link', () => {
        document.body.innerHTML = '<section id="worked-join"><h2 id="worked-join-heading">Worked join</h2><a id="example-splines-worked-join-spline-c1">Guided example</a></section>';
        const section = document.getElementById('worked-join')!;
        section.getBoundingClientRect = () => ({top: 100} as DOMRect);
        Object.defineProperty(window, 'scrollY', {configurable: true, value: 400});
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        const focus = vi.spyOn(document.getElementById('example-splines-worked-join-spline-c1')!, 'focus');
        const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            callback(0);
            return 1;
        });

        const returnPath = '/bezeg-2.0/learn/splines#worked-join';
        rememberGuidedExampleReading(returnPath, 'example-splines-worked-join-spline-c1');
        Object.defineProperty(window, 'scrollY', {configurable: true, value: 0});
        section.getBoundingClientRect = () => ({top: 500} as DOMRect);

        expect(restoreGuidedExampleReading(returnPath)).toBe(true);
        expect(focus).toHaveBeenCalledWith({preventScroll: true});
        expect(scrollTo).toHaveBeenCalledWith(0, 400);
        expect(raf).toHaveBeenCalledOnce();
    });

    it('returns false when Back or Forward reaches a visit without a guided-example bookmark', () => {
        expect(restoreGuidedExampleReading('/bezeg-2.0/learn/splines#unvisited-section')).toBe(false);
    });
});
