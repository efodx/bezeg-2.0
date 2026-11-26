import {describe, expect, it} from 'vitest';
import {helpPlacement} from './helpPlacement';
import type {Box} from './helpPlacement';

const bounds: Box = {left: 55, top: 202, right: 1385, bottom: 780};
const card = {width: 240, height: 89};

describe('helpPlacement', () => {
    it('keeps the card above a puck in a bottom dock, where the old fixed placement was right', () => {
        const puck: Box = {left: 96, top: 640, right: 256, bottom: 690};
        const p = helpPlacement(puck, card, bounds, false);
        expect(p.side).toBe('above');
        expect(p.shift).toBe(0);
    });

    it('puts the card beside the first puck of a column dock, where a card above would be clipped', () => {
        // The first puck of the left dock stands 4 px under the top of the bounds: bottom: 100% would run 89 px past it.
        const puck: Box = {left: 64, top: 206, right: 224, bottom: 256};
        const p = helpPlacement(puck, card, bounds, true);
        expect(p.side).toBe('right');
        expect(puck.top - 15 - card.height).toBeLessThan(bounds.top);
    });

    it('uses the left side of a right dock', () => {
        const puck: Box = {left: 1218, top: 206, right: 1378, bottom: 256};
        expect(helpPlacement(puck, card, bounds, true).side).toBe('left');
    });

    it('moves a row card below when there is no room above', () => {
        const puck: Box = {left: 300, top: 210, right: 460, bottom: 260};
        expect(helpPlacement(puck, card, bounds, false).side).toBe('below');
    });

    it('shifts a side card up to stay inside the bounds', () => {
        const puck: Box = {left: 64, top: 760, right: 224, bottom: 780};
        const p = helpPlacement(puck, card, bounds, true);
        expect(p.side).toBe('right');
        expect(puck.top + p.shift + card.height).toBeLessThanOrEqual(bounds.bottom);
    });

    it('limits height so the card scrolls when no side holds it', () => {
        const small: Box = {left: 0, top: 0, right: 300, bottom: 60};
        const p = helpPlacement({left: 10, top: 20, right: 170, bottom: 50}, {width: 240, height: 200}, small, false);
        expect(p.maxHeight).toBeLessThan(60);
    });
});
