'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {inspectSurfaceViewInPage} = require('./surface-view-evidence.cjs');
const {fakeSurfaceHost} = require('./surface-view-fixture.cjs');

test('a drawn SVG surface view passes and counts only shown drawables with finite points', () => {
    const shown = inspectSurfaceViewInPage(fakeSurfaceHost({shapes: [{points: '1,2 3,4'}, {points: '1,2 3,4 5,6', display: 'none'}, {points: ''}]}));
    assert.deepEqual(shown, {ok: true, reason: '', view: 'board2d', svg: {width: 420, height: 260}, drawables: 1});
});

test('a missing, empty or collapsed surface view fails with a reason', () => {
    const cases = [
        [{view: null}, /no \[data-jsx-surface-view\]/],
        [{hasSvg: false}, /no SVG/],
        [{size: {width: 0, height: 260}}, /zero size/],
        [{shapes: []}, /no drawn polygon\/polyline/],
        [{shapes: [{points: ''}]}, /no drawn polygon\/polyline/],
        [{shapes: [{points: '1,2'}]}, /no drawn polygon\/polyline/],
        [{shapes: [{points: '1,2 NaN,4'}]}, /no drawn polygon\/polyline/],
        [{shapes: [{points: '1,2 3,4', display: 'none'}]}, /no drawn polygon\/polyline/],
    ];
    for (const [options, reason] of cases) {
        const result = inspectSurfaceViewInPage(fakeSurfaceHost(options));
        assert.equal(result.ok, false, JSON.stringify(options));
        assert.match(result.reason, reason);
    }
    assert.equal(inspectSurfaceViewInPage(null).ok, false);
});
