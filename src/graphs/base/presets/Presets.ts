import {message, LocalizedError, Message} from "../../../localization";
import {BaseGraphState, BoardState} from "../BaseGraph";
import {checkPresetCollection, commitPresetImport, preflightPresetImport, presetCollectionForStorageKey} from "./PresetImport";
import {appStorage} from "../../../storage/appStorage";

const PRESETS_PREFIX = "preset-";

/** Scene state as stored in a Preset: older or hand-written files may lack `initialized` and carry graph-specific fields that each graph reads after narrowing. */
export type StoredGraphState = Partial<BaseGraphState>;

/** A stored Preset. `data` is the graph family's Preset data; stored data is `unknown` until its collection checks it. */
export interface Preset<D = unknown> {
    id: string,
    data?: D,
    boardState?: BoardState,
    graphState?: StoredGraphState
}

export interface Presets {
    data: Preset[]
}

/**
 * What a read or write of one stored collection came to. `data` is always a usable list (empty when the collection could
 * not be read); `problem` says why the stored value was not used or not written. A collection that cannot be read is
 * never overwritten: its raw value stays in storage.
 */
export type PresetsOutcome = Presets & { problem?: Message }

/** A backup of every stored collection: the file contents, the keys left out because they cannot be read, and a problem when storage itself is unavailable. */
export interface PresetBackup {
    contents: string,
    skipped: string[],
    problem?: Message
}

const UNAVAILABLE = () => message("presets_storage_unavailable");
const UNREADABLE = () => message("stored_presets_unreadable_left_unchanged");
const QUOTA = () => message("cannot_save_presets_free_browser_storage_space_and_try_again");

/**
 * Parses one stored collection with the complete check of the Preset file (`checkPresetCollection`): envelope, names, and
 * every Preset's data, view and state. A collection that fails stays unread; the returned Presets are the stored values,
 * unchanged, so a later save rewrites nothing the check did not accept. A key the app defines no collection for (never
 * read by a graph) gets the envelope and name rules only.
 */
function parseCollection(id: string, raw: string): Presets | undefined {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return undefined; }
    const collection = presetCollectionForStorageKey(PRESETS_PREFIX + id) ?? {key: id, check: (data: unknown) => ({data}), checkGraphState: () => undefined};
    return "rejection" in checkPresetCollection(collection, parsed) ? undefined : parsed as Presets;
}


/** First `preset-N` (N = 1, 2, ...) that no preset in the collection uses. */
export function firstUnusedPresetName(presets: Preset[]): string {
    const used = new Set(presets.map(preset => preset.id));
    let n = 1;
    while (used.has(`preset-${n}`)) n++;
    return `preset-${n}`;
}

export class PresetService {
    private readonly id: string;

    constructor(id: string) {
        this.id = id;
    }

    /** Every stored collection as a Preset file, skipping (never deleting) collections that cannot be read. */
    exportAll(): PresetBackup {
        const exportDto: Record<string, unknown> = {};
        const skipped: string[] = [];
        try {
            for (let index = 0; index < appStorage.length; index++) {
                const key = appStorage.key(index);
                const value = key === null ? null : appStorage.getItem(key);
                if (key?.startsWith(PRESETS_PREFIX) && value !== null) {
                    const collection = parseCollection(key.slice(PRESETS_PREFIX.length), value);
                    if (collection) exportDto[key] = collection; else skipped.push(key);
                }
            }
        } catch {
            return {contents: "{}", skipped: [], problem: UNAVAILABLE()};
        }
        return {contents: JSON.stringify(exportDto, null, '\t'), skipped};
    }

    exportAllPresetsToString() {
        return this.exportAll().contents;
    }

    importFromString(str: string) {
        const plan = preflightPresetImport(str, appStorage);
        if (plan.replacements.length) { throw new LocalizedError(message("confirm_replacement_of_existing_preset_collections_first")); }
        commitPresetImport(plan, appStorage);
    }

    /** Reads this collection. Never throws: unreadable or unavailable storage gives an empty list and a `problem`. */
    loadPresets(): PresetsOutcome {
        let raw: string | null;
        try { raw = appStorage.getItem(PRESETS_PREFIX + this.id); }
        catch { return {data: [], problem: UNAVAILABLE()}; }
        if (!raw) return {data: []};
        return parseCollection(this.id, raw) ?? {data: [], problem: UNREADABLE()};
    }

    /** Writes the collection; a failed write leaves the stored value as it was and reports the problem. */
    private write(presets: Presets): PresetsOutcome {
        try { appStorage.setItem(PRESETS_PREFIX + this.id, JSON.stringify(presets)); }
        catch (error) { return {...presets, problem: error instanceof DOMException && error.name === "SecurityError" ? UNAVAILABLE() : QUOTA()}; }
        return presets;
    }

    /** Changes the stored collection unless it could not be read, so a corrupt value is never overwritten. */
    private update(change: (presets: Presets) => void): PresetsOutcome {
        const presets = this.loadPresets();
        if (presets.problem) return presets;
        change(presets);
        return this.write(presets);
    }

    removePreset(id: string): PresetsOutcome {
        return this.update(presets => { presets.data = presets.data.filter(preset => preset.id !== id); });
    }

    /**
     * Changes the id (the name) of a stored preset in place: order and every other field stay. The new name is trimmed; an
     * empty or already used name, or a missing source, is refused with a `problem` and nothing is written. An unreadable
     * collection is never overwritten.
     */
    renamePreset(id: string, newName: string): PresetsOutcome {
        const name = newName.trim();
        const presets = this.loadPresets();
        if (presets.problem) return presets;
        const preset = presets.data.find(candidate => candidate.id === id);
        if (!preset) return {...presets, problem: message("state_missing")};
        if (name === "") return {...presets, problem: message("state_name_required")};
        if (name !== id && presets.data.some(candidate => candidate.id === name)) return {...presets, problem: message("state_name_taken")};
        preset.id = name;
        return this.write(presets);
    }

    savePreset(preset: Preset): PresetsOutcome {
        return this.update(presets => {
            const storedPreset = presets.data.find(preset2 => preset2.id === preset.id);
            if (storedPreset) Object.assign(storedPreset, preset); else presets.data.push(preset);
        });
    }

    getPreset(id: string) {
        return this.loadPresets().data.find(preset => preset.id === id);
    }
}
