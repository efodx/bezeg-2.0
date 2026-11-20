import React from 'react';
import {ELDER_SETTINGS, ElderSettings} from './sideBotanicals/elderGeometry';
import {StillElder} from './sideBotanicals/StillElder';

/** Box in generator units: the space right of the Home headline, from the header down to the actions. */
export const HOME_ELDER_BOX = {width: 620, height: 380};

/** Two branches with a few heads, drawn smaller than the gutter elder so the spray fits beside the headline. */
const SETTINGS: ElderSettings = {...ELDER_SETTINGS, left: 2, right: 2, top: 30, bottom: 78, reach: 80, size: .85, thick: 1.8, heads: 3, headSize: 1.1, leaves: 3};

/**
 * Home's hero spray for screens too narrow for the side botanicals (under 1600px): one still elder reaching in
 * from the right edge beside the headline. Decorative only; the stylesheet hides it where the gutters carry
 * the elder and on phones.
 */
export function HomeElder() {
    return <StillElder className="welcome-elder" settings={SETTINGS} box={HOME_ELDER_BOX}/>;
}
