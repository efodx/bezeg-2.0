import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import {CONTROL_ROW, CONTROL_ROW_FILL} from './controlRow';

const css = readFileSync(join(__dirname, 'ControlRow.css'), 'utf8');

test('the control row class names are stable', () => {
    expect(CONTROL_ROW).toBe('control-row');
    expect(CONTROL_ROW_FILL).toBe('control-row control-row--fill');
});

test('a coarse pointer gives control-row buttons 44 px, with selectors that outrank the workspace button rules', () => {
    const coarse = css.slice(css.indexOf('@media (pointer: coarse), (max-width: 700px)'));
    expect(coarse).toContain('.demonstration-workspace .control-row button');
    expect(coarse).toContain('.workspace-inspector .tools .control-row .btn');
    expect(coarse).toMatch(/min-height: 44px/);
});
