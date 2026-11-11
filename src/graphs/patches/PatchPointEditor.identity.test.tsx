import {render} from '@testing-library/react';
import React from 'react';
import {expect, test, vi} from 'vitest';

const seen = vi.hoisted(() => ({lists: [] as unknown[]}));
vi.mock('../../inputs/PointListInput', () => ({PointListInput: (props: {points: unknown}) => { seen.lists.push(props.points); return null; }}));

import {PatchPointEditor} from './PatchPointEditor';

// PointListInput drops a shown refusal when the list it was given changes identity, so an unchanged point must give the same list.
test('a rerender with the same point passes the same list, a moved point a new one', () => {
    seen.lists.length = 0;
    const onCommit = () => {};
    const view = render(<PatchPointEditor name="P" xyz={[1, 2, 3]} onCommit={onCommit}/>);
    view.rerender(<PatchPointEditor name="P" xyz={[1, 2, 3]} onCommit={onCommit}/>);
    expect(seen.lists).toHaveLength(2);
    expect(seen.lists[1]).toBe(seen.lists[0]);
    view.rerender(<PatchPointEditor name="P" xyz={[1, 2, 4]} onCommit={onCommit}/>);
    expect(seen.lists[2]).not.toBe(seen.lists[0]);
});
