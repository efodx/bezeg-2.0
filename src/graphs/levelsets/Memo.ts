/** One cached value with the values it was made from (compared one by one, never as text). */
export class Memo<V> {
    private key?: readonly unknown[];
    private value?: V;
    computations = 0;
    get(key: readonly unknown[], make: () => V): V {
        const previous = this.key;
        if (previous === undefined || previous.length !== key.length || key.some((item, index) => item !== previous[index])) {
            this.value = make();
            this.key = key;
            this.computations++;
        }
        return this.value as V;
    }
}
