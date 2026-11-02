/** Test helper: the most Next steps any compgeo trace test may take. Default traces have well under a hundred steps. */
export const MAX_TEST_TRACE_STEPS = 1000;

/**
 * Runs `step` while `condition` holds, failing after `limit` steps, so that a broken Next step
 * fails the test instead of hanging it.
 */
export function stepWhile(condition: () => boolean, step: () => void, limit = MAX_TEST_TRACE_STEPS): void {
    for (let taken = 0; condition(); taken++) {
        if (taken >= limit) throw new Error(`The trace did not finish within ${limit} steps.`);
        step();
    }
}
