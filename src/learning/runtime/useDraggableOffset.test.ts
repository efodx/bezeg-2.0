import {clampOffset, computeGeometry} from './useDraggableOffset';

const bounds = {left: 0, top: 0, right: 1000, bottom: 600};
const base = {left: 100, top: 20, right: 500, bottom: 320};

test('an offset inside the bounds is kept', () => {
    expect(clampOffset({x: 200, y: 100}, base, bounds)).toEqual({x: 200, y: 100});
});

test('an offset past any edge stops a small gap inside it', () => {
    expect(clampOffset({x: 5000, y: 5000}, base, bounds)).toEqual({x: 494, y: 274});
    expect(clampOffset({x: -5000, y: -5000}, base, bounds)).toEqual({x: -94, y: -14});
});

test('an element larger than the bounds keeps its top-left edge visible', () => {
    const tall = {left: 100, top: 20, right: 500, bottom: 920};
    expect(clampOffset({x: 0, y: 300}, tall, bounds).y).toBe(-14);
    expect(clampOffset({x: 0, y: -300}, tall, bounds).y).toBe(-14);
});

test('the card may leave the board but stays inside the window', () => {
    const board = {left: 51, top: 271, right: 901, bottom: 871};
    const card = {left: 204, top: 283, right: 748, bottom: 708};
    const viewport = {width: 1280, height: 720};
    const geometry = computeGeometry(board, card, {x: 0, y: 0}, viewport)!;
    // Fully past the board's right edge (onto the inspector), still inside the window.
    expect(clampOffset({x: 500, y: 0}, geometry.base, geometry.bounds)).toEqual({x: 500, y: 0});
    // Far beyond the window: the grip stays on screen.
    const far = clampOffset({x: 9000, y: -9000}, geometry.base, geometry.bounds);
    expect(far.x).toBe(1280 - 6 - 748);
    expect(far.y).toBe(6 - 283);
});

test('a card taller than the window keeps its top-left grip on screen', () => {
    const geometry = computeGeometry({left: 0, top: 0, right: 900, bottom: 600}, {left: 100, top: 20, right: 500, bottom: 920}, {x: 0, y: 0}, {width: 1280, height: 720})!;
    expect(clampOffset({x: 0, y: 400}, geometry.base, geometry.bounds).y).toBe(-14);
});
