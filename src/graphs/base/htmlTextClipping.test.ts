import {skipRedundantHtmlTextClipping} from './htmlTextClipping';

function boardWith(viewport: unknown) {
    const original = vi.fn();
    const renderer = {setObjectViewport: original};
    return {board: {renderer, attr: {viewport}} as any, renderer, original};
}

test('skips clipping HTML texts for the default zero viewport and clears an earlier clip', () => {
    const {board, renderer, original} = boardWith([0, 0, 0, 0]);
    skipRedundantHtmlTextClipping(board);
    const rendNode = {style: {clipPath: 'inset(1px 2px 3px 4px)'}};

    renderer.setObjectViewport({visProp: {viewport: 'inherit'}, rendNode}, true);

    expect(original).not.toHaveBeenCalled();
    expect(rendNode.style.clipPath).toBe('');
});

test('keeps JSXGraph clipping for non-zero viewports and SVG elements', () => {
    const {board, renderer, original} = boardWith([0, 0, 0, 0]);
    skipRedundantHtmlTextClipping(board);
    const html = {visProp: {viewport: [0, '10%', 0, 0]}, rendNode: {style: {clipPath: ''}}};
    const svg = {visProp: {viewport: 'inherit'}};

    renderer.setObjectViewport(html, true);
    renderer.setObjectViewport(svg);

    expect(original).toHaveBeenNthCalledWith(1, html, true);
    expect(original).toHaveBeenNthCalledWith(2, svg, undefined);
});

test('patches each renderer once', () => {
    const {board, renderer} = boardWith([0, 0, 0, 0]);
    skipRedundantHtmlTextClipping(board);
    const patched = renderer.setObjectViewport;
    skipRedundantHtmlTextClipping(board);
    expect(renderer.setObjectViewport).toBe(patched);
});
