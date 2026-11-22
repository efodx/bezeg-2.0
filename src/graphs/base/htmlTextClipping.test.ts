import {JSXGraph} from 'jsxgraph';
import type {Board} from 'jsxgraph';
import {installBoardShims} from './realGraphTestHarness';
import {skipRedundantHtmlTextClipping} from './htmlTextClipping';

installBoardShims();

const boards: {board: Board; container: HTMLElement}[] = [];

function realBoard() {
    const container = document.createElement('div');
    container.id = `clip-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const board = JSXGraph.initBoard(container.id, {boundingbox: [-5, 5, 5, -5], axis: false, showCopyright: false,
        showNavigation: false, renderer: 'svg'});
    boards.push({board, container});
    return board;
}

/** The method JSXGraph's renderer calls to clip HTML texts, found on the renderer's prototype chain. */
function spyOnJsxGraphClip(board: Board) {
    let owner = Object.getPrototypeOf(board.renderer);
    while (owner && !Object.prototype.hasOwnProperty.call(owner, 'updateClipPath')) owner = Object.getPrototypeOf(owner);
    expect(owner, 'JSXGraph renamed updateClipPath; update htmlTextClipping.ts').toBeTruthy();
    return vi.spyOn(owner, 'updateClipPath');
}

afterEach(() => {
    vi.restoreAllMocks();
    for (const {board, container} of boards.splice(0)) {
        JSXGraph.freeBoard(board);
        container.remove();
    }
});

test('JSXGraph clips HTML texts through updateClipPath on board updates', () => {
    const board = realBoard();
    const clip = spyOnJsxGraphClip(board);
    const text = board.create('text', [1, 1, 'A'], {display: 'html'});
    clip.mockClear();
    (text as any).setPosition(JXG.COORDS_BY_USER, [2, 2]);
    board.update();
    expect(clip).toHaveBeenCalled();
});

test('skips the per-label clip on a board whose container clips its overflow and clears an earlier clip', () => {
    const board = realBoard();
    expect((board.renderer as any).container.style.overflow).toBe('hidden');
    const clip = spyOnJsxGraphClip(board);
    const text = board.create('text', [1, 1, 'A'], {display: 'html'});
    const node = (text as any).rendNode as HTMLElement;
    node.style.clipPath = 'rect(0px 10px 10px 0px)';

    skipRedundantHtmlTextClipping(board);
    clip.mockClear();
    (text as any).setPosition(JXG.COORDS_BY_USER, [2, 2]);
    board.update();

    expect(clip).not.toHaveBeenCalled();
    expect(node.style.clipPath).toBe('');
});

test('keeps JSXGraph clipping when the container does not clip its overflow', () => {
    const board = realBoard();
    (board.renderer as any).container.style.overflow = 'visible';
    const clip = spyOnJsxGraphClip(board);
    const text = board.create('text', [1, 1, 'A'], {display: 'html'});

    skipRedundantHtmlTextClipping(board);
    clip.mockClear();
    (text as any).setPosition(JXG.COORDS_BY_USER, [2, 2]);
    board.update();

    expect(clip).toHaveBeenCalled();
});

test('patches each renderer once', () => {
    const board = realBoard();
    skipRedundantHtmlTextClipping(board);
    const patched = (board.renderer as any).updateClipPath;
    skipRedundantHtmlTextClipping(board);
    expect((board.renderer as any).updateClipPath).toBe(patched);
});
