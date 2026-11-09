import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {ResetExampleButton} from './ResetExampleButton';

test('the button resets while the scene differs from the example', () => {
    const onReset = vi.fn();
    render(<ResetExampleButton atExample={false} onReset={onReset}/>);
    fireEvent.click(screen.getByRole('button'));
    expect(onReset).toHaveBeenCalledTimes(1);
});

test('at the example it is aria-disabled with a reason, does nothing and announces the reason when pressed', () => {
    const onReset = vi.fn();
    render(<ResetExampleButton atExample onReset={onReset}/>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription(/.+/);
    fireEvent.click(button);
    expect(onReset).not.toHaveBeenCalled();
    expect(document.querySelector('[data-reset-example-reason]')).not.toBeNull();
});
