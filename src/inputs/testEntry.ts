import {fireEvent} from '@testing-library/react';

/** Whether the element is a text field (a NumberInput); a range or select still changes at once. */
const isTextField = (element: HTMLElement) => element instanceof HTMLInputElement && element.type === 'text';

/** Test helper: the user types `value` into a NumberInput and presses Enter (typing alone only edits the draft). */
export function enterNumber(input: HTMLElement, value: string): void {
    if (!isTextField(input)) {
        fireEvent.change(input, {target: {value}});
        return;
    }
    fireEvent.input(input, {target: {value}, inputType: 'insertText'});
    fireEvent.keyDown(input, {key: 'Enter'});
}

/** Test helper: the user types `value` into a NumberInput and leaves the field. */
export function blurNumber(input: HTMLElement, value: string): void {
    fireEvent.input(input, {target: {value}, inputType: 'insertText'});
    fireEvent.blur(input);
}
