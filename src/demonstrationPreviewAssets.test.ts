import {getDemonstrationCatalog} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {POSTER_PENDING} from './demonstrationPosterPending';

const {demonstrations} = getDemonstrationCatalog();

describe('generated Demonstration preview posters', () => {
    it('lists only registered Demonstrations whose poster is still missing as pending', () => {
        expect(POSTER_PENDING.filter(id => demonstrationPreviewAssets[id] || !demonstrations.some(entry => entry.id === id))).toEqual([]);
        expect(new Set(POSTER_PENDING).size).toBe(POSTER_PENDING.length);
    });

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
