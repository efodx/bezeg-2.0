import React from 'react';
import {ELDER_SETTINGS, ElderSettings} from './sideBotanicals/elderGeometry';
import {StillElder} from './sideBotanicals/StillElder';

/** Generator box in units; the drawn viewBox is fitted to the whole drawing (`StillElder fit`). */
export const HOME_ELDER_BOX = {width: 620, height: 380};

/**
 * Two branches with a few heads, smaller than the gutter elder. Seed 8 arches low and wide, so the fitted drawing
 * (about 675 by 460 units) sits beside the headline rather than towering over it.
 */
export const HOME_ELDER_SETTINGS: ElderSettings = {...ELDER_SETTINGS, left: 2, right: 2, top: 30, bottom: 78, reach: 80, size: .7, thick: 1.8, heads: 3, headSize: 1.1, leaves: 3, seed: 8};

/**
 * Home's hero spray for screens too narrow for the side botanicals (under 1600px): one still elder reaching in
 * from the right edge beside the headline. Decorative only; the stylesheet hides it where the gutters carry
 * the elder and on phones.
 */
export function HomeElder() {
    return <StillElder className="welcome-elder" settings={HOME_ELDER_SETTINGS} box={HOME_ELDER_BOX} fit/>;
}
