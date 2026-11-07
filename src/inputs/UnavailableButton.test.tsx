import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {UnavailableButton} from './UnavailableButton';

test('an unavailable button stays focusable, carries the reason in title and description, and runs nothing on click, Enter or Space', async () => {
    const onPress = vi.fn();
    const onBlockedPress = vi.fn();
    render(<UnavailableButton reason="Ni več korakov." onPress={onPress} onBlockedPress={onBlockedPress}>Naprej</UnavailableButton>);
    const button = screen.getByRole('button', {name: 'Naprej'});
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('title', 'Ni več korakov.');
    expect(button).toHaveAccessibleDescription('Ni več korakov.');
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onPress).not.toHaveBeenCalled();
    expect(onBlockedPress).toHaveBeenCalledTimes(3);
    expect(onBlockedPress).toHaveBeenLastCalledWith('Ni več korakov.');
    expect(button).toHaveFocus();
});

test('an available button is ordinary: no aria-disabled, no title, no description, runs its action', () => {
    const onPress = vi.fn();
    const onBlockedPress = vi.fn();
    render(<UnavailableButton onPress={onPress} onBlockedPress={onBlockedPress}>Naprej</UnavailableButton>);
    const button = screen.getByRole('button', {name: 'Naprej'});
    expect(button).toHaveAttribute('aria-disabled', 'false');
    expect(button).not.toHaveAttribute('title');
    expect(button).not.toHaveAttribute('aria-describedby');
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onBlockedPress).not.toHaveBeenCalled();
});

test('a caller description stays joined with the reason', () => {
    render(<><p id="extra">Dodatno.</p><UnavailableButton reason="Razlog." aria-describedby="extra" onPress={() => undefined}>Naprej</UnavailableButton></>);
    expect(screen.getByRole('button')).toHaveAccessibleDescription('Razlog. Dodatno.');
});
