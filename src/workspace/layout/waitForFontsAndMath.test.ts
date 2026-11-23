import {afterEach, describe, expect, it, vi} from 'vitest';
import {waitForFontsAndMath} from './useMeasuredCards';

type Win = Window & {MathJax?: unknown};

/** The measure layer is read again on every fold; typesetting it must not typeset MathJax output a second time (a nested formula each pass). */
describe('waitForFontsAndMath', () => {
  afterEach(() => { delete (window as Win).MathJax; document.body.innerHTML = ''; });

  it('never typesets an element that already holds MathJax output, across fold cycles', async () => {
    const layer = document.createElement('div');
    layer.innerHTML = '<span id="a"><mjx-container><mjx-assistive-mml><math><mi>x</mi></math></mjx-assistive-mml></mjx-container></span>'
      + '<p id="raw">\\(y\\) is typeset here</p>';
    document.body.append(layer);
    const typeset = vi.fn(async (elements?: Element[]) => {
      for (const el of elements ?? []) {
        // what real MathJax does to output it is handed again: nest the assistive MathML as a new formula
        el.querySelectorAll('mjx-assistive-mml').forEach((m) => m.append(document.createElement('mjx-container')));
      }
    });
    (window as Win).MathJax = {startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise: typeset};
    for (let cycle = 0; cycle < 5; cycle += 1) await waitForFontsAndMath(layer);
    expect(layer.querySelectorAll('mjx-container').length).toBe(1);
    const handed = typeset.mock.calls.flatMap(([elements]) => elements ?? []);
    expect(handed.every((el) => el.id === 'raw')).toBe(true);
    expect(handed.length).toBeGreaterThan(0);
  });
});
