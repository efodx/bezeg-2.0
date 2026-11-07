import {getDemonstrationCatalog} from './demonstrations';
import {demonstrationMotionAssets} from './demonstrationMotionAssets';
import {MOTION_PENDING} from './demonstrationMotionPending';

const {demonstrations} = getDemonstrationCatalog();
const known = new Set<string>(demonstrations.map(entry => entry.id));
const pendingIds = MOTION_PENDING.map(entry => entry.id);

describe('Demonstration catalog clips', () => {
    it('has a clip or a pending entry for every Demonstration', () => {
        const missing = demonstrations.filter(entry => !demonstrationMotionAssets[entry.id] && !pendingIds.includes(entry.id)).map(entry => entry.id);
        expect({missing}).toEqual({missing: []});
    });

    it('lists only known Demonstrations without a clip, once each, with a reason', () => {
        const stale = pendingIds.filter(id => demonstrationMotionAssets[id]);
        const unknown = pendingIds.filter(id => !known.has(id));
        const duplicate = pendingIds.filter((id, index) => pendingIds.indexOf(id) !== index);
        const unexplained = MOTION_PENDING.filter(entry => !entry.reason.trim()).map(entry => entry.id);
        expect({stale, unknown, duplicate, unexplained}).toEqual({stale: [], unknown: [], duplicate: [], unexplained: []});
    });

    it('has no clip for an unknown Demonstration', () => {
        expect(Object.keys(demonstrationMotionAssets).filter(id => !known.has(id))).toEqual([]);
    });

    it('accounts for every Demonstration exactly once', () => {
        expect(Object.keys(demonstrationMotionAssets).length + MOTION_PENDING.length).toBe(demonstrations.length);
    });
});
