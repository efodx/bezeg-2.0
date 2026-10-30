/** Second half of the framing check against the pinhole oracle; see `jsxFramingOracle.test-helper.ts`. */
import {afterAll, beforeAll, describe, it} from 'vitest';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {collectFramingCases, type FramingCase} from './jsxFraming.test-helper';
import {expectJsxFramingMatchesOracle, framingHalf} from './jsxFramingOracle.test-helper';

let cases: FramingCase[] = [];

describe('JSXGraph surface view framing on the patch routes (second half)', () => {
    beforeAll(() => {
        installBoardShims();
        cases = collectFramingCases();
    }, REAL_GRAPH_TEST_TIMEOUT);
    afterAll(() => { cases = []; });

    it('draws every vertex and point where the oracle puts it', async () => {
        await expectJsxFramingMatchesOracle(framingHalf(cases, 1));
    }, 300_000);
});
