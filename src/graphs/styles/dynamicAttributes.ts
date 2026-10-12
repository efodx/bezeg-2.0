/**
 * A JSXGraph attribute object in which every value, at any depth, may also be a function that JSXGraph
 * re-evaluates whenever the element is drawn (`size: () => SizeContext.pointSize`). The bundled typings
 * only declare the plain value.
 */
export type DynamicAttributes<T> =
    [NonNullable<T>] extends [readonly unknown[]] ? T | (() => T)
        : [NonNullable<T>] extends [(...args: never[]) => unknown] ? T
            : [NonNullable<T>] extends [object] ? T | { [K in keyof NonNullable<T>]?: DynamicAttributes<NonNullable<T>[K]> }
                : T | (() => T);

/**
 * Declare JSXGraph attributes that may contain callbacks. Returns the attributes typed as `T`, which is
 * what `board.create` accepts; the library evaluates callback values itself.
 */
export function dynamicAttributes<T extends object>(attributes: DynamicAttributes<T>): T {
    return attributes as T;
}
