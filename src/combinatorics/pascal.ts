/** Pascal rows by the addition rule from the previous row (BigInt). Independent of `binomial`. */
import {assertCount} from './binomial';

export function pascalRow(n: number): bigint[] {
    assertCount(n, 'n');
    let row: bigint[] = [1n];
    for (let r = 1; r <= n; r++) {
        const next: bigint[] = [1n];
        for (let k = 1; k < r; k++) next.push(row[k - 1] + row[k]);
        next.push(1n);
        row = next;
    }
    return row;
}
