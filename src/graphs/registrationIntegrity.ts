/**
 * Pure integrity check of feature-local registrations (spec lesson-authoring-architecture R1, task 03). It takes plain data so
 * tests can pass synthetic failing registrations; every issue names the family and the id, path or key concerned.
 */
/**
 * An explicit absence of a Preset collection (R-circle): the Demonstration keeps no browser-local Preset, and the reason says why.
 * Omitting a reference stays an error; only this declaration is accepted instead of a storage key.
 */
export type NoPresetCollection = Readonly<{none: string}>;

export type FamilyRegistrationInput = Readonly<{
    family: string;
    rows: readonly Readonly<{id: string; path: string}>[];
    /** Ids that have a runtime loader. */
    loaderIds: readonly string[];
    /** Demonstration id to the storage key of its Preset collection, or to the explicit absence of one. */
    collectionKeys: Readonly<Record<string, string | NoPresetCollection>>;
    /** The family's Preset collections (canonical definitions; one collection may be referenced repeatedly). */
    collections: readonly Readonly<{key: string}>[];
}>;

/** What the legacy tables already own: registered ids, paths, factory ids and collections must stay disjoint from it. */
export type LegacyRegistrationInput = Readonly<{
    rows: readonly Readonly<{id: string; path: string}>[];
    factoryIds: readonly string[];
    collections: readonly Readonly<{key: string}>[];
}>;

export function checkRegistrations(families: readonly FamilyRegistrationInput[], legacy: LegacyRegistrationInput): string[] {
    const issues: string[] = [];
    const ids = new Map<string, string>(legacy.rows.map(row => [row.id, 'legacy']));
    const paths = new Map<string, string>(legacy.rows.map(row => [row.path, 'legacy']));
    const factoryIds = new Set(legacy.factoryIds);
    const collectionsByKey = new Map<string, {owner: string; collection: object}>();
    const claim = (owner: string, collection: Readonly<{key: string}>) => {
        const known = collectionsByKey.get(collection.key);
        if (known && known.collection !== collection) {
            issues.push(`${owner}: collection key "${collection.key}" is defined by a different collection than the one of ${known.owner}.`);
        } else if (!known) collectionsByKey.set(collection.key, {owner, collection});
    };
    legacy.collections.forEach(collection => claim('legacy', collection));

    for (const entry of families) {
        const {family} = entry;
        const loaders = new Set(entry.loaderIds);
        const keys = new Set(entry.collections.map(collection => collection.key));
        for (const {id, path} of entry.rows) {
            const idOwner = ids.get(id);
            if (idOwner) issues.push(`${family}: id "${id}" is already registered by ${idOwner}.`);
            else ids.set(id, family);
            const pathOwner = paths.get(path);
            if (pathOwner) issues.push(`${family}: path "${path}" (id "${id}") is already registered by ${pathOwner}.`);
            else paths.set(path, family);
            if (factoryIds.has(id)) issues.push(`${family}: id "${id}" is also in the legacy graph factory table.`);
            if (!loaders.has(id)) issues.push(`${family}: id "${id}" has no runtime loader.`);
            const key = entry.collectionKeys[id];
            if (key === undefined) issues.push(`${family}: id "${id}" has no collection reference.`);
            else if (typeof key === 'object') {
                if (key.none.trim() === '') issues.push(`${family}: id "${id}" declares no collection without a reason.`);
            } else if (!keys.has(key)) issues.push(`${family}: id "${id}" references unknown collection key "${key}".`);
        }
        const rowIds = new Set(entry.rows.map(row => row.id));
        for (const id of loaders) if (!rowIds.has(id)) issues.push(`${family}: loader "${id}" has no row.`);
        entry.collections.forEach(collection => claim(family, collection));
    }
    return issues;
}
