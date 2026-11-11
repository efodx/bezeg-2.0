/**
 * Test support: which entries a catalog sweep runs. Tier: sampled locally, full in CI.
 * `scripts/transient-state-scope.cjs` decides (CI, BEZEG_SWEEPS=all, a sweep's own variable, shared paths) and
 * `vite.config.mts` provides the result; this module applies it to a sweep's entries.
 * The sweeps: the transient state contract, the lesson restoration contract, the scene content test, the scene
 * replacement contract and the Preset round trip contract (docs/commands.md, "Catalog sweep scope").
 */
import {test} from 'vitest';
import {getDemonstrationCatalog, type DemonstrationId} from '../../demonstrations';

export type SweepScope = {all: boolean; reason: string; ids: string[] | null; changedNames: string[]; changedFiles: string[]};

declare module 'vitest' {
    interface ProvidedContext {
        transientStateScope: SweepScope;
        lessonRestorationScope: SweepScope;
        sceneContentScope: SweepScope;
        sceneReplacementScope: SweepScope;
        presetRoundTripScope: SweepScope;
    }
}

/** The class names of a graph and its superclasses, matched against the names of changed files. */
export function classNames(graph: object): string[] {
    const names: string[] = [];
    for (let proto = Object.getPrototypeOf(graph); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
        names.push(proto.constructor.name);
    }
    return names;
}

/**
 * The entries of `all` this run checks: every one without a scope, in CI or after a shared change; the listed ones for an
 * explicit list (unknown ids throw); otherwise `sample` plus the entries `reached` by the changed files.
 * `reached` runs only when the branch changed a source file.
 */
export function selectEntries<Id extends string>(
    scope: SweepScope | undefined, variable: string, all: readonly Id[], sample: readonly Id[], reached: (id: Id, scope: SweepScope) => boolean,
): Id[] {
    if (!scope || scope.all) return [...all];
    if (scope.ids) {
        const unknown = scope.ids.filter(id => !(all as readonly string[]).includes(id));
        if (unknown.length) throw new Error(`${variable} names unknown entries: ${unknown.join(', ')}. Use ids from the catalog, or "all".`);
        return all.filter(id => scope.ids!.includes(id));
    }
    return all.filter(id => sample.includes(id) || (scope.changedFiles.length > 0 && reached(id, scope)));
}

/** Names the entries a sampled run left out and how to run them all, in the skipped count. */
export function skippedPlaceholder(left: number, noun: string, variable: string): void {
    if (left > 0) test.skip(`${left} more ${noun}: set ${variable}=all or BEZEG_SWEEPS=all (CI runs every one)`, () => undefined);
}

/**
 * The graphs the transient state contract mounts when the branch changes no shared file (the lesson restoration sweep
 * starts from them too): one per restoration mechanism the contract
 * special-cases (child board, surface view, no Preset collection or data, Preset data in the model, no synchronous scene
 * change, rational weights, pointer sketches) and per family. The subdivision graphs, a third of the cost, stay out.
 */
export const TRANSIENT_STATE_SAMPLE: readonly DemonstrationId[] = [
    'bezier', 'rational', 'spline-c1', 'ph-cubic', 'interp-hermite', 'circle', 'bernstein', 'patch-tensor',
    'mean-value', 'complex-multiplication', 'linear-map', 'orientation', 'triangle-centres', 'projective-pascal',
];

/**
 * A sample that covers every family: `seed` (the entries picked for a restoration mechanism) plus the first of `ids` in
 * catalog order for each family the seed leaves out. Derived from the Demonstration definitions, so a new family joins it.
 */
export function familySample(ids: readonly DemonstrationId[], seed: readonly DemonstrationId[]): DemonstrationId[] {
    const {demonstrations} = getDemonstrationCatalog();
    const familyOf = (id: DemonstrationId) => demonstrations.find(demonstration => demonstration.id === id)?.family;
    const covered = new Set(seed.filter(id => ids.includes(id)).map(familyOf));
    const sample = seed.filter(id => ids.includes(id));
    for (const demonstration of demonstrations) {
        if (!ids.includes(demonstration.id) || covered.has(demonstration.family)) continue;
        covered.add(demonstration.family);
        sample.push(demonstration.id);
    }
    return sample;
}
