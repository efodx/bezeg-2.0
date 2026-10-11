import {SegmentAttributes} from "jsxgraph";
import {SizeContext} from "../context/SizeContext";
import {GraphPalette, constructionLevelColor, constructionLevelDash} from "./GraphPalette";

const segmentStyle: SegmentAttributes = {
    strokeWidth: () => SizeContext.strokeWidth,
    color: GraphPalette.controlPolygon,
    fixed: true
};

const controlPolygonStyle: SegmentAttributes = {
    ...segmentStyle,
    color: GraphPalette.controlPolygon,
    strokeWidth: () => SizeContext.strokeWidth,
    dash: 2
};

function constructionLevelStyle(level: number, fixed = false): SegmentAttributes {
    return {
        color: constructionLevelColor(level),
        strokeWidth: () => SizeContext.strokeWidth,
        dash: constructionLevelDash(level),
        ...(fixed ? {fixed: true} : {})
    };
}

export const SegmentStyles = {
    default: segmentStyle,
    controlPolygon: controlPolygonStyle,
    construction: constructionLevelStyle
};
