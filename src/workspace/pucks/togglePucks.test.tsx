import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PuckOwned, PuckOwnershipContext} from '../../graphs/base/controls/PuckOwnership';
import {checkDeclaration, MAX_CHOICE_PUCK_OPTIONS, type ActionDeclaration, type GraphDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {message} from '../../localization';
import {ChoicePuck} from './ChoicePuck';
import {puckItems, puckOwnedKeys} from './PuckStrip';
import {TogglePuck} from './TogglePuck';

afterEach(cleanup);

const OPTIONS = [{value: 'a', label: 'Alpha', text: 'A'}, {value: 'b', label: 'Beta'}, {value: 'c', label: 'Gamma'}];

describe('toggle puck', () => {
    it('is a switch named by its label that shows its state', () => {
        const {rerender} = render(<TogglePuck label="Napaka" pressed={false} onToggle={() => {}}/>);
        const control = screen.getByRole('switch', {name: 'Napaka'});
        expect(control.getAttribute('aria-checked')).toBe('false');
        rerender(<TogglePuck label="Napaka" pressed onToggle={() => {}}/>);
        expect(screen.getByRole('switch', {name: 'Napaka'}).getAttribute('aria-checked')).toBe('true');
    });

    it('flips on a click and on Space or Enter, and ignores other keys', () => {
        const onToggle = vi.fn();
        render(<TogglePuck label="Napaka" pressed={false} onToggle={onToggle}/>);
        const control = screen.getByRole('switch');
        fireEvent.click(control);
        fireEvent.keyDown(control, {key: ' '});
        fireEvent.keyDown(control, {key: 'Enter'});
        fireEvent.keyDown(control, {key: 'a'});
        expect(onToggle).toHaveBeenCalledTimes(3);
    });
});

describe('choice puck', () => {
    it('is a radiogroup of radios named by their labels, the value checked and the segment text shown', () => {
        render(<ChoicePuck label="Sistem" options={OPTIONS} value="b" onSelect={() => {}}/>);
        expect(screen.getByRole('radiogroup', {name: 'Sistem'})).toBeTruthy();
        const radios = screen.getAllByRole('radio');
        expect(radios.map(radio => radio.getAttribute('aria-label'))).toEqual(['Alpha', 'Beta', 'Gamma']);
        expect(radios.map(radio => radio.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
        expect(radios[0].textContent).toBe('A');
        expect(radios[1].textContent).toBe('Beta');
    });

    it('selects on a click of another segment only', () => {
        const onSelect = vi.fn();
        render(<ChoicePuck label="Sistem" options={OPTIONS} value="b" onSelect={onSelect}/>);
        fireEvent.click(screen.getByRole('radio', {name: 'Beta'}));
        expect(onSelect).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('radio', {name: 'Gamma'}));
        expect(onSelect).toHaveBeenCalledWith('c');
    });

    it('moves with the arrow keys, wrapping, and Home and End', () => {
        const onSelect = vi.fn();
        render(<ChoicePuck label="Sistem" options={OPTIONS} value="c" onSelect={onSelect}/>);
        const group = screen.getByRole('radiogroup');
        fireEvent.keyDown(group, {key: 'ArrowRight'});
        expect(onSelect).toHaveBeenLastCalledWith('a');
        fireEvent.keyDown(group, {key: 'ArrowLeft'});
        expect(onSelect).toHaveBeenLastCalledWith('b');
        fireEvent.keyDown(group, {key: 'Home'});
        expect(onSelect).toHaveBeenLastCalledWith('a');
        fireEvent.keyDown(group, {key: 'End'});
        expect(onSelect).toHaveBeenLastCalledWith('c');
    });
});

const action = (id: string, extra: Partial<ActionDeclaration> = {}): ActionDeclaration =>
    ({id, label: message('shell_card_tools'), placement: 'board', enabled: true, pressed: false, ...extra});
const group = (key: string) => ({key, label: message('shell_card_legend')});
const declare = (actions: ActionDeclaration[]): GraphDeclaration => ({actions});

describe('puck items of declared actions', () => {
    it('lists a toggle per `puck: true` action and one group per shared group key, in declared order', () => {
        const items = puckItems(declare([
            action('t', {puck: true}),
            action('g1', {puck: {group: group('g'), short: message('shell_card_tools')}}),
            action('plain'),
            action('g2', {puck: {group: group('g'), short: message('shell_card_tools')}}),
        ]), []);
        expect(items.map(item => item.kind)).toEqual(['toggle', 'group']);
        expect(items.flatMap(puckOwnedKeys)).toEqual(['t', 'g', 'g1', 'g2']);
    });

    it('omits the Orodja control of an owned key and keeps the others', () => {
        render(<PuckOwnershipContext.Provider value={new Set(['t'])}>
            <PuckOwned param="t"><span>owned</span></PuckOwned><PuckOwned param="u"><span>kept</span></PuckOwned>
        </PuckOwnershipContext.Provider>);
        expect(screen.queryByText('owned')).toBeNull();
        expect(screen.getByText('kept')).toBeTruthy();
    });
});

describe('puck declaration check', () => {
    it('rejects a choice puck of more than the allowed options', () => {
        const options = Array.from({length: MAX_CHOICE_PUCK_OPTIONS + 1}, (_, index) => ({value: `o${index}`, label: message('shell_card_tools')}));
        const problems = checkDeclaration({parameters: [{kind: 'choice', key: 'c', label: message('shell_card_tools'), placement: 'board', puck: true, options}]});
        expect(problems.some(problem => problem.problem.includes('at most'))).toBe(true);
    });

    it('rejects a puck action that is not on the board or does not report its state', () => {
        expect(checkDeclaration(declare([action('a', {puck: true, placement: 'tools'})])).some(problem => problem.problem.includes('board'))).toBe(true);
        expect(checkDeclaration(declare([action('a', {puck: true, pressed: undefined})])).some(problem => problem.problem.includes('pressed'))).toBe(true);
    });

    it('rejects a group of one action', () => {
        expect(checkDeclaration(declare([action('a', {puck: {group: group('g'), short: message('shell_card_tools')}})])).length).toBeGreaterThan(0);
    });
});
