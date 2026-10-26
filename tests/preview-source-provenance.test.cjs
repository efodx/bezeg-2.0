const {test} = require('node:test');
const assert = require('node:assert/strict');
const {selectiveSourceProvenance} = require('../scripts/capture-demonstration-previews.cjs');

const previous = {
    graphSourceRevision: 'prior-revision',
    graphSourceFingerprint: 'prior-fingerprint',
    selectiveRecapture: {mixedGraphSource: true, preservedCaptureIds: ['retained']},
};

test('selective recapture rejects mathematical source mismatch by default', () => {
    assert.throws(() => selectiveSourceProvenance(previous, 'current-fingerprint'),
        /different mathematical source/);
});

test('selective recapture accepts a matching source without marking mixed provenance', () => {
    assert.deepEqual(selectiveSourceProvenance(previous, 'prior-fingerprint'), {
        previousGraphSourceRevision: 'prior-revision',
        previousGraphSourceFingerprint: 'prior-fingerprint',
        mixedSource: false,
    });
});

test('explicit preservation opt-in retains the prior source identity for preserved captures', () => {
    assert.deepEqual(selectiveSourceProvenance(previous, 'current-fingerprint', true), {
        previousGraphSourceRevision: 'prior-revision',
        previousGraphSourceFingerprint: 'prior-fingerprint',
        mixedSource: true,
    });
});
