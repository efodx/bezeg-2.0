import {render} from '@testing-library/react';
import {describe, expect, test} from 'vitest';
import {PuckOwnedGroup, PuckOwnershipContext} from './PuckOwnership';

const show = (owned: string[]) => render(<PuckOwnershipContext.Provider value={new Set(owned)}>
    <PuckOwnedGroup params={['a', 'b']} className="inspector-group" role="group" aria-label="g">content</PuckOwnedGroup>
</PuckOwnershipContext.Provider>);

describe('PuckOwnedGroup', () => {
    test('is rendered while a control it holds is still in Orodja', () => {
        expect(show([]).container.querySelector('[role="group"]')?.textContent).toBe('content');
        expect(show(['a']).container.querySelector('[role="group"]')).not.toBeNull();
    });

    test('leaves no empty group when pucks own all of its controls', () => {
        expect(show(['a', 'b']).container.innerHTML).toBe('');
    });
});
