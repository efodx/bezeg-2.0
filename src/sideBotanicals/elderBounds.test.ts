import {describe, expect, it} from 'vitest';
import {buildSide, ElderBranch} from './elderGeometry';
import {elderBounds} from './elderBounds';
import {HOME_ELDER_BOX, HOME_ELDER_SETTINGS} from '../HomeElder';

describe('elderBounds', () => {
    it('covers absolute points and floret circles', () => {
        const branch: ElderBranch = {hingeY: 0, duration: 1, delay: 0, paths: [{fill: 'x', d: 'M0 10L50 -20C60 0 70 0 80 5Z', at: 0, baseX: 0, baseY: 0}],
            heads: [{at: 0, baseX: 0, baseY: 0, duration: 1, delay: 0, subsets: [],
                paths: [{fill: 'y', d: 'M95 40a5 5 0 1 0 10 0a5 5 0 1 0 -10 0'}]}]};
        expect(elderBounds([branch], 2)).toEqual({x: -2, y: -22, width: 109, height: 69});
    });

    it('holds the whole Home spray, which the generator box alone would cut', () => {
        const b = elderBounds(buildSide(HOME_ELDER_SETTINGS, 'right', HOME_ELDER_BOX.width, HOME_ELDER_BOX.height));
        expect(Number.isFinite(b.width) && Number.isFinite(b.height)).toBe(true);
        // The fitted spray stays wider than tall, so it sits beside the headline rather than towering over it.
        expect(b.width / b.height).toBeGreaterThan(1.2);
    });
});
