import {message, LocalizedError} from "../../../localization";
import {BaseGraphState, BoardState} from "../BaseGraph";
import {commitPresetImport, preflightPresetImport} from "./PresetImport";
import {appStorage} from "../../../storage/appStorage";

const PRESETS_PREFIX = "preset-";

export interface Preset {
    id: string,
    data?: any,
    boardState?: BoardState,
    graphState?: BaseGraphState
}

export interface Presets {
    data: Preset[]
}


export class PresetService {
    private readonly id: string;

    constructor(id: string) {
        this.id = id;
    }

    exportAllPresetsToString() {
        const exportDto: any = {};
        for (let index = 0; index < appStorage.length; index++) {
            const key = appStorage.key(index);
            const value = key === null ? null : appStorage.getItem(key);
            if (key?.startsWith(PRESETS_PREFIX) && value !== null) {
                exportDto[key] = JSON.parse(value);
            }
        }
        return JSON.stringify(exportDto, null, '\t');
    }

    importFromString(str: string) {
        const plan = preflightPresetImport(str, appStorage);
        if (plan.replacements.length) { throw new LocalizedError(message("confirm_replacement_of_existing_preset_collections_first")); }
        commitPresetImport(plan, appStorage);
    }

    loadPresets() {
        let preset: string | null;
        try { preset = appStorage.getItem(PRESETS_PREFIX + this.id); }
        catch { return {data: []} as Presets; }
        if (preset) {
            return JSON.parse(preset) as Presets;
        }
        return {data: []} as Presets;
    }

    savePresets(presets: Presets) {
        appStorage.setItem(PRESETS_PREFIX + this.id, JSON.stringify(presets));
    }

    removePreset(id: string) {
        const presets = this.loadPresets();
        presets.data = presets.data.filter(preset => preset.id !== id);
        this.savePresets(presets);
        return presets;
    }

    savePreset(preset: Preset) {
        const presets = this.loadPresets();
        console.debug("Saving preset data:");
        console.debug(preset.data);
        const storedPreset = presets.data.find(preset2 => preset2.id === preset.id);
        if (storedPreset) {
            Object.assign(storedPreset, preset);
        } else {
            presets.data.push(preset);
        }
        this.savePresets(presets);
        return presets;
    }

    getPreset(id: string) {
        const presets = this.loadPresets();
        return presets.data.filter(preset => preset.id === id)[0];
    }
}
