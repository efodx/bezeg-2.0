import type {PointSetModel} from "../../compgeo/pointSetModel";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {degenerateCollection, DEGENERATE_EXAMPLES, DEGENERATE_PRESET_KEY, degenerateExampleModel} from "./degenerateSitesPresets";
import type {VoronoiExampleId} from "./VoronoiControls";
import {matchingExample} from "./ExampleSelect";
import {VoronoiGraph} from "./VoronoiGraph";
import type {VoronoiMode} from "./voronoiPresetCollection";

const EXAMPLE_IDS: readonly VoronoiExampleId[] = ["square", "trapezoid", "near", "collinear"];

/**
 * Degenerate sites (task 20, spec B5): the Voronoi graph that starts in four-point mode on the unit square, with the mode
 * switch and the named examples in its panel and its own Preset collection `compgeo-voronoi-degenerate`. It adds no behaviour of
 * its own; the modes, the incircle readout and the collinear display belong to `VoronoiGraph`. It never moves a point by itself.
 */
export class DegenerateSitesGraph extends VoronoiGraph {
    protected override defaultMode(): VoronoiMode {
        return "four-point";
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return degenerateCollection;
    }

    override defaultPreset(): PointSetModel {
        return degenerateExampleModel("square");
    }

    protected override exampleModel(): PointSetModel {
        return degenerateExampleModel("square");
    }

    protected override showsModeSwitch(): boolean {
        return true;
    }

    protected override exampleIds(): readonly VoronoiExampleId[] {
        return EXAMPLE_IDS;
    }

    protected override currentExampleId(): VoronoiExampleId | undefined {
        return matchingExample(this.model, EXAMPLE_IDS.map(id => ({id, ...degenerateExampleModel(id)})));
    }

    /** An example replaces the sites and sets the mode its Preset names (the collinear example is in `sites` mode). */
    protected override loadExample(id: VoronoiExampleId): void {
        const graphState = {initialized: true, mode: DEGENERATE_EXAMPLES[id].mode};
        this.importPreset({id: DEGENERATE_PRESET_KEY, graphState, data: degenerateExampleModel(id)});
    }
}
