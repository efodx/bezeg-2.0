/**
 * Members JSXGraph provides at runtime but its bundled typings (node_modules/jsxgraph/src/index.d.ts)
 * omit. This is a global script (no imports or exports) so that it merges into the library's global `JXG`
 * namespace, which `declare module "jsxgraph"` re-exports. Interface merging cannot change the type of
 * an existing member, so callback-valued attributes (for example `size: () => number`) are handled by
 * `src/graphs/styles/dynamicAttributes.ts` instead.
 */
declare namespace JXG {
    interface GeometryElement {
        /**
         * Whether the screen position (`scrCoords[1]`, `scrCoords[2]`) hits this element. Subclasses such as
         * Curve and Circle declare it themselves; Point and others inherit this declaration.
         */
        hasPoint(x: number, y: number): boolean;
    }
}
