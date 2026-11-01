import {getDemonstrationCatalog} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';

const {demonstrations} = getDemonstrationCatalog();
/** Registered before their poster is captured; remove an id here when its capture lands. */
const POSTER_PENDING: readonly string[] = ['linear-map', 'orientation', 'polygon-area', 'convex-hull'];

describe('generated Demonstration preview posters', () => {
    it('has a poster for every Demonstration', () => {
        const missing = demonstrations.filter(entry => !demonstrationPreviewAssets[entry.id] && !POSTER_PENDING.includes(entry.id)).map(entry => entry.id);
        const unknown = Object.keys(demonstrationPreviewAssets).filter(id => !demonstrations.some(entry => entry.id === id));
        expect({
            missing,
            unknown,
            hint: missing.length || unknown.length
                ? `Regenerate src/demonstrationPreviewAssets.ts with "node scripts/capture-demonstration-previews.cjs" (needs a served build; see docs/commands.md). Missing: ${missing.join(', ') || 'none'}; unknown: ${unknown.join(', ') || 'none'}.`
                : 'complete',
        }).toEqual({missing: [], unknown: [], hint: 'complete'});
    });
});
