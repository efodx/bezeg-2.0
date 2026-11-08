import {act, fireEvent, screen} from '@testing-library/react';
import {enterNumber} from '../../inputs/testEntry';

/** Test helper: the user picks the option shown as `optionText` in the select named `label`. */
export function chooseOption(label: string | RegExp, optionText: string): void {
    const select = screen.getByLabelText<HTMLSelectElement>(label);
    const option = [...select.options].find(candidate => candidate.text === optionText);
    if (!option) throw new Error(`no option "${optionText}" in "${String(label)}": ${[...select.options].map(candidate => candidate.text).join(', ')}`);
    act(() => { fireEvent.change(select, {target: {value: option.value}}); });
}

/** Test helper: the user types `value` into the number field named `label` and presses Enter. */
export function typeNumber(label: string | RegExp, value: string | number): void {
    act(() => { enterNumber(screen.getByLabelText(label), String(value)); });
}
