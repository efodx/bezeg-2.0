const test = require('node:test');
const assert = require('node:assert');
const {graphFileOf, declarationTestOf, parityRecordingsOf, parityFilter, sharedTestsOf} = require('./graph-check-resolve.cjs');

const inventory = {demonstrations: [
    {id: 'circle', graphFile: 'src/graphs/curves/rational/RationalBezierCurveCircleGraphN.tsx'},
    {id: 'circle-construction', graphFile: 'src/graphs/compgeo/CircleConstructionGraph.tsx'},
    {id: 'linear-map', graphFile: 'src/graphs/linear/LinearMapGraph.tsx'},
]};
const source = `
    {file: 'linear/__parity__/linear-map-basis.json', demonstration: 'linear-map', states: [
    {file: 'linear/__parity__/linear-map-determinant.json', demonstration: 'linear-map', states: [
    {file: 'compgeo/__parity__/circle-construction.json', demonstration: 'circle-construction', states: [
`;

test('circle and circle-construction resolve to their own files, not a prefix match', () => {
    assert.equal(declarationTestOf(graphFileOf(inventory, 'circle')), 'src/graphs/curves/rational/RationalBezierCurveCircleGraphN.declaration.test.tsx');
    assert.equal(declarationTestOf(graphFileOf(inventory, 'circle-construction')), 'src/graphs/compgeo/CircleConstructionGraph.declaration.test.tsx');
    assert.deepEqual(parityRecordingsOf(source, 'circle'), []);
    assert.deepEqual(parityRecordingsOf(source, 'circle-construction'), ['circle-construction']);
});

test('linear-map resolves every per-mode recording and one filter', () => {
    const names = parityRecordingsOf(source, 'linear-map');
    assert.deepEqual(names, ['linear-map-basis', 'linear-map-determinant']);
    assert.equal(parityFilter(names), 'parity recording (linear-map-basis|linear-map-determinant) ');
    assert.equal(declarationTestOf(graphFileOf(inventory, 'linear-map')), 'src/graphs/linear/LinearMapGraph.declaration.test.tsx');
});

test('unknown ids and shared tests', () => {
    assert.equal(graphFileOf(inventory, 'nope'), undefined);
    assert.equal(declarationTestOf(undefined), undefined);
    const partition = {lanes: [{demonstrations: ['circle'], sharedTests: ['graphs/a.test.tsx']}]};
    assert.deepEqual(sharedTestsOf(partition, 'circle'), ['src/graphs/a.test.tsx']);
    assert.deepEqual(sharedTestsOf(partition, 'linear-map'), []);
});
