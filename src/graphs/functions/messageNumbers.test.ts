import {beforeEach, expect, test} from 'vitest';
import {renderMessage, setLanguage, Message} from '../../localization';
import {numberRangeRejected, integerRangeRejected} from './functionSetterMessages';
import {zeroListIssueMessage} from './zeroListMessages';
import {rationalFunctionEditMessage} from './rationalFunctionMessages';
import {fourierSeriesEditMessage} from './fourierSeriesMessages';
import {eulerEditMessage} from './eulerMessages';
import {taylorEditMessage} from './taylorMessages';
import {bisectionEditMessage} from './bisectionMessages';

beforeEach(() => setLanguage('sl'));

/** Builds the message while Slovenian is active, then reads it in English: the decimal separator must follow the reading. */
function switches(build: () => Message, slText: string, enText: string): void {
    setLanguage('sl');
    const built = build();
    expect(renderMessage(built)).toContain(slText);
    setLanguage('en');
    expect(renderMessage(built)).toContain(enText);
    expect(renderMessage(built)).not.toContain(slText);
}

test('function setter range refusals', () => {
    switches(() => numberRangeRejected('derivative_x0_label', -2.5, 3), '−2,5', '−2.5');
    switches(() => integerRangeRejected('integral_n_label', 1.5, 3), '1,5', '1.5');
});
test('zero list and rational refusals', () => {
    switches(() => zeroListIssueMessage({kind: 'zero-range', min: -2.5, max: 3}), '−2,5', '−2.5');
    switches(() => rationalFunctionEditMessage({kind: 'k-range', min: -2.5, max: 3}), '−2,5', '−2.5');
});
test('euler step refusal lists its allowed steps in the language at render time', () => {
    switches(() => eulerEditMessage({kind: 'step', allowed: [0.25, 0.5]}), '0,25, 0,5', '0.25, 0.5');
});
test('fourier, euler, taylor and bisection refusals', () => {
    switches(() => fourierSeriesEditMessage({kind: 'x', min: -2.5, max: 3}), '−2,5', '−2.5');
    switches(() => eulerEditMessage({kind: 'x-range', coordinates: ['x0'], min: -2.5, max: 3}), '−2,5', '−2.5');
    switches(() => taylorEditMessage({kind: 'x', example: 'sine', min: -2.5, max: 3}), '−2,5', '−2.5');
    switches(() => bisectionEditMessage({kind: 'range', endpoints: ['a'], min: -2.5, max: 3}), '−2,5', '−2.5');
});
