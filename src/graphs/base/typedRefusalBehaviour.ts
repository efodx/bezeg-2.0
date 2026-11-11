import {expect} from 'vitest';

/**
 * Test helper: a graph's typed-value refusal as one table row per field. The generic refusal (reason text in both languages, Reset clears
 * it) is the `refusal` contract of `sharedControlBehaviour`; what is a graph's own is each field's range and whether it takes whole
 * numbers only, so a row states exactly that and the helper drives the refused values: just above `max`, just below `min`, and through the
 * edit path (the field itself rounds a typed fraction to its grid) a fraction of a whole-number field. A refused value is neither stored nor clamped, so `read()` must be unchanged afterwards.
 */
export interface TypedRefusalRow {
    /** Names the row in a failure. */
    field: string;
    /** The stored value now, compared before and after each refused entry. */
    read(): unknown;
    min: number;
    max: number;
    /** The field takes whole numbers only, so a fraction is refused as well. */
    whole?: boolean;
    /** The graph's edit path for the field (what the control calls): it must return false for every refused value, NaN included. */
    edit?(value: number): boolean;
}

/** The values typed into the field that must be refused. */
export function refusedTyped(row: Pick<TypedRefusalRow, 'min' | 'max'>): number[] {
    return [row.max + 1, row.min - 1];
}

/** Types each refused value of each row through `type(field, text)` (decimal comma) and checks that nothing changed. */
export function expectTypedRefusals(type: (field: string, text: string) => void, rows: readonly TypedRefusalRow[]): void {
    for (const row of rows) {
        for (const value of refusedTyped(row)) {
            const before = row.read();
            type(row.field, String(value).replace('.', ','));
            expect([row.field, value, row.read()]).toEqual([row.field, value, before]);
        }
        if (!row.edit) continue;
        const before = row.read();
        const results = [...refusedTyped(row), ...(row.whole ? [row.min + 0.5] : []), Number.NaN].map(value => row.edit!(value));
        expect([row.field, results, row.read()]).toEqual([row.field, results.map(() => false), before]);
    }
}
