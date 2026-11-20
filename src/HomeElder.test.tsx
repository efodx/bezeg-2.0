import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {buildSide} from './sideBotanicals/elderGeometry';
import {elderBounds} from './sideBotanicals/elderBounds';
import {HOME_ELDER_BOX, HOME_ELDER_SETTINGS, HomeElder} from './HomeElder';

describe('HomeElder', () => {
    it('fits its viewBox to the whole drawing, from the entry edge', () => {
        const {container} = render(<HomeElder/>);
        const svg = container.querySelector('svg.welcome-elder')!;
        const [x, y, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
        const b = elderBounds(buildSide(HOME_ELDER_SETTINGS, 'right', HOME_ELDER_BOX.width, HOME_ELDER_BOX.height));
        expect(x).toBe(0);
        expect(y).toBeLessThanOrEqual(b.y);
        expect(y + h).toBeGreaterThanOrEqual(b.y + b.height);
        expect(w).toBeGreaterThanOrEqual(b.x + b.width);
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect((svg as SVGElement).style.aspectRatio).toBe(`${w} / ${h}`);
    });
});
