import {describe, expect, test} from 'vitest';
import {captionLines, captionPlacement} from './KinematicsGraph';

describe('captionPlacement keeps the captions clear of the y-axis tick labels', () => {
    test('an axis near the left edge puts the captions to its right', () => {
        const placement = captionPlacement(60, 900);
        expect(placement.indent).toBeGreaterThan(60);
        expect(placement.indent + placement.room).toBeLessThanOrEqual(890);
    });

    test('an axis in the right part leaves the captions at the left edge, short of the tick labels', () => {
        const placement = captionPlacement(800, 900);
        expect(placement.indent).toBe(10);
        expect(placement.indent + placement.room).toBeLessThanOrEqual(800 - 60 + 1e-9);
    });

    test('an axis off the board changes nothing', () => {
        expect(captionPlacement(-40, 900)).toEqual({indent: 10, room: 880});
        expect(captionPlacement(970, 900)).toEqual({indent: 10, room: 880});
    });

    test('an axis just beyond the right edge keeps the captions short of its tick labels, which are still on the board', () => {
        const placement = captionPlacement(930, 900);
        expect(placement.indent).toBe(10);
        expect(placement.indent + placement.room).toBeLessThanOrEqual(930 - 60);
    });

    test('a narrower room wraps a caption onto more lines', () => {
        expect(captionLines('x'.repeat(60), 880)).toBe(1);
        expect(captionLines('x'.repeat(60), 300)).toBe(2);
    });
});
