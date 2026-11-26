/** `readPanel` leaves out read-offs inside a `data-parity-retained` control (the curve point editor stays in Orodja). */
import {readPanel} from './parity';

const panel = (html: string): HTMLElement => {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
};
const graph = {} as never;

describe('readPanel and retained controls', () => {
    test('an output, readout and note inside the marker are not recorded; the same outside are', () => {
        const html = (marker: string) => `<div ${marker}><output>5</output><div data-readout><dt>n</dt><dd>5</dd></div><p data-readout-note>point</p></div>`;
        const outside = readPanel(panel(html('')), graph, 'a');
        expect([outside.outputs, outside.rows.length, outside.notes]).toEqual([['5'], 1, ['point']]);
        const inside = readPanel(panel(html('data-parity-retained')), graph, 'b');
        expect([inside.outputs, inside.rows, inside.notes]).toEqual([[], [], []]);
    });

    test('a read-off beside the marker is still recorded', () => {
        const state = readPanel(panel('<div data-parity-retained><output>5</output></div><output>t = 0,5</output>'), graph, 'c');
        expect(state.outputs).toEqual(['t = 0,5']);
    });
});
