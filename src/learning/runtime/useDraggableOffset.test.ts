import {clampOffset} from './useDraggableOffset';

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
