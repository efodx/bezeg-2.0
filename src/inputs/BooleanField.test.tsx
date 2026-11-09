import React, {useState} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BooleanField} from './BooleanField';
import {OnOffSwitch} from './OnOffSwitch';

const variants = ['switch', 'checkbox'] as const;

test.each(variants)('the %s variant is a native checkbox named by its label that reports the requested value', variant => {
    const onChange = vi.fn();
    const {rerender} = render(<BooleanField variant={variant} label="Prikaži mrežo" checked={false} onChange={onChange}/>);
    const box = screen.getByRole('checkbox', {name: 'Prikaži mrežo'}) as HTMLInputElement;
    expect(box.type).toBe('checkbox');
    expect(box).not.toHaveAttribute('role'); // no role is added for the look: the switch is announced as a checkbox
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onChange).toHaveBeenLastCalledWith(true);
    // controlled: the box shows the prop, not its own click
    expect(box).not.toBeChecked();
    rerender(<BooleanField variant={variant} label="Prikaži mrežo" checked onChange={onChange}/>);
    expect(box).toBeChecked();
    fireEvent.click(screen.getByText('Prikaži mrežo')); // the label is part of the hit area
    expect(onChange).toHaveBeenLastCalledWith(false);
});

test.each(variants)('the %s variant toggles with Space and carries its own presentation class', variant => {
    function Harness() {
        const [on, setOn] = useState(false);
        return <BooleanField variant={variant} label="Os" checked={on} onChange={setOn}/>;
    }
    const {container} = render(<Harness/>);
    const box = screen.getByRole('checkbox', {name: 'Os'});
    expect(container.firstElementChild).toHaveClass('bool-field', `bool-field-${variant}`);
    userEvent.tab();
    expect(box).toHaveFocus();
    userEvent.keyboard(' ');
    expect(box).toBeChecked();
    userEvent.keyboard(' ');
    expect(box).not.toBeChecked();
});

test.each(variants)('the %s variant does nothing when disabled', variant => {
    const onChange = vi.fn();
    render(<BooleanField variant={variant} label="Os" checked={false} disabled onChange={onChange}/>);
    const box = screen.getByRole('checkbox', {name: 'Os'});
    expect(box).toBeDisabled();
    userEvent.click(box);
    expect(onChange).not.toHaveBeenCalled();
});

test('help and describedBy both describe the field, and the name stays the label alone', () => {
    render(<div><p id="why">Zakaj je izklopljeno</p>
        <BooleanField variant="switch" label="Os" checked={false} onChange={() => undefined} help="Kratka razlaga" describedBy="why"/></div>);
    const box = screen.getByRole('checkbox', {name: 'Os'});
    expect(box).toHaveAccessibleDescription('Zakaj je izklopljeno Kratka razlaga');
    expect(screen.getByText('Kratka razlaga')).toHaveClass('bool-field-help');
});

test('without help or describedBy the field has no description', () => {
    render(<BooleanField variant="checkbox" label="Os" checked={false} onChange={() => undefined}/>);
    expect(screen.getByRole('checkbox', {name: 'Os'})).not.toHaveAttribute('aria-describedby');
});

test('two fields with the same label keep separate label associations', () => {
    render(<div><BooleanField variant="switch" label="Os" checked onChange={() => undefined}/>
        <BooleanField variant="checkbox" label="Os" checked={false} onChange={() => undefined}/></div>);
    const [first, second] = screen.getAllByRole('checkbox', {name: 'Os'});
    expect(first.id).not.toBe(second.id);
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
});

test('OnOffSwitch is the switch variant, has no form of its own and cannot submit an enclosing form with Enter or Space', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onChange = vi.fn();
    const {container} = render(<form onSubmit={onSubmit}>
        <OnOffSwitch label="Prikaži" checked={false} onChange={onChange}/><button type="submit">Pošlji</button></form>);
    expect(container.querySelectorAll('form')).toHaveLength(1);
    expect(container.querySelector('.bool-field')).toHaveClass('bool-field-switch');
    const box = screen.getByRole('checkbox', {name: 'Prikaži'});
    userEvent.tab();
    expect(box).toHaveFocus();
    userEvent.keyboard('{enter}');
    userEvent.keyboard(' ');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1); // Space toggled, Enter did not
    expect(onChange).toHaveBeenLastCalledWith(true);
});

test('an unavailable switch stays focusable, ignores changes and shows its reason as linked help', () => {
    const onChange = vi.fn();
    render(<OnOffSwitch label="Prikaži" checked={false} onChange={onChange} unavailableReason="Najprej dodajte točko."/>);
    const box = screen.getByRole('checkbox', {name: 'Prikaži'});
    expect(box).not.toBeDisabled();
    expect(box).toHaveAttribute('aria-disabled', 'true');
    expect(box).toHaveAccessibleDescription('Najprej dodajte točko.');
    userEvent.tab();
    expect(box).toHaveFocus();
    userEvent.click(box);
    userEvent.keyboard(' ');
    expect(onChange).not.toHaveBeenCalled();
    expect(box).not.toBeChecked();
});
