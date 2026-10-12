import {SegmentAttributes} from "jsxgraph";
import type {DisplaySettings} from "../base/DisplaySettings";
import {GraphPalette, constructionLevelColor, constructionLevelDash} from "./GraphPalette";

/** Segment attribute presets whose callbacks read the display settings of one graph. */
export function createSegmentStyles(settings: DisplaySettings) {
    const segmentStyle: SegmentAttributes = {
        strokeWidth: () => settings.strokeWidth,
        color: GraphPalette.controlPolygon,
        fixed: true
    };

    const controlPolygonStyle: SegmentAttributes = {
        ...segmentStyle,
        color: GraphPalette.controlPolygon,
        strokeWidth: () => settings.strokeWidth,
        dash: 2
    };

    function constructionLevelStyle(level: number, fixed = false): SegmentAttributes {
        return {
            color: constructionLevelColor(level),
            strokeWidth: () => settings.strokeWidth,
            dash: constructionLevelDash(level),
            ...(fixed ? {fixed: true} : {})
        };
    }

    return {
        default: segmentStyle,
        controlPolygon: controlPolygonStyle,
        construction: constructionLevelStyle
    };
}

export type SegmentStyleSet = ReturnType<typeof createSegmentStyles>;
