import {beforeEach, expect, test} from 'vitest';
import {message, messageNumber, renderMessage, setLanguage} from './index';

beforeEach(() => setLanguage('sl'));

test('a number parameter is formatted when the message renders, in the language then active', () => {
    const refusal = message('function_number_range_rejected', {value0: message('derivative_x0_label'), value1: messageNumber(-2.5), value2: messageNumber(3.14159, 3)});
    expect(renderMessage(refusal)).toContain('−2,5');
    expect(renderMessage(refusal)).toContain('3,142');
    setLanguage('en');
    expect(renderMessage(refusal)).toContain('−2.5');
    expect(renderMessage(refusal)).toContain('3.142');
});

test('a number inside a nested message follows the language too', () => {
    const inner = message('function_number_range_rejected', {value0: message('derivative_x0_label'), value1: messageNumber(2.5), value2: messageNumber(7)});
    const outer = message('zero_list_file', {value0: inner});
    expect(renderMessage(outer)).toContain('2,5');
    setLanguage('en');
    expect(renderMessage(outer)).toContain('2.5');
    expect(renderMessage(outer)).not.toContain('2,5');
});
