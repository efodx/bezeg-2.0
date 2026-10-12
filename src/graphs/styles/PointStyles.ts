import {PointAttributes} from "jsxgraph";
import {SizeContext} from "../context/SizeContext";
import {VisibilityContext} from "../context/VisibilityContext";
import {GraphPalette, constructionLevelColor} from "./GraphPalette";
import {dynamicAttributes} from "./dynamicAttributes";


const pointStyle = dynamicAttributes<PointAttributes>({
    size: () => SizeContext.pointSize,
    fillColor: GraphPalette.controlPoint,
    strokeColor: GraphPalette.pointOutline,
    strokeWidth: 1.5,
    highlightFillColor: GraphPalette.selectedControlPoint,
    highlightStrokeColor: GraphPalette.selectedControlPointOutline,
    label: {
        color: GraphPalette.label,
        fontSize: () => SizeContext.fontSize,
        useMathJax: true,
        parse: false,
        anchorY: "bottom",
        anchorX: "left",
        //   anchorX: "middle",
        offset: () => [0, SizeContext.fontSize * -0.3],
        visible: () => VisibilityContext.pointsVisible()
    },
    name: "",
});

const hodographPointStyle = dynamicAttributes<PointAttributes>({
    ...pointStyle,
    size: () => Math.max(4, 0.5 * SizeContext.pointSize),
    label: {
        fontSize: () => Math.max(20, 0.5 * SizeContext.fontSize),
        useMathJax: true,
        parse: false
    }
});

const fixedPointStyle = dynamicAttributes<PointAttributes>({
    ...pointStyle,
    fixed: true,
    fillColor: GraphPalette.derivedPoint,
    highlightFillColor: GraphPalette.derivedPoint
});

const compactLabelDirections = [
    {x: 0, y: -1, anchorX: "middle" as const, anchorY: "bottom" as const},
    {x: 1, y: -1, anchorX: "left" as const, anchorY: "bottom" as const},
    {x: 1, y: 0, anchorX: "left" as const, anchorY: "middle" as const},
    {x: 1, y: 1, anchorX: "left" as const, anchorY: "top" as const},
    {x: 0, y: 1, anchorX: "middle" as const, anchorY: "top" as const},
    {x: -1, y: 1, anchorX: "right" as const, anchorY: "top" as const},
    {x: -1, y: 0, anchorX: "right" as const, anchorY: "middle" as const},
    {x: -1, y: -1, anchorX: "right" as const, anchorY: "bottom" as const}
] as const;

export function decasteljauLabelLayout(level: number, pointIndex: number, pointCount: number): {direction: number, ring: number} {
    const count = Math.max(1, Math.trunc(pointCount));
    const normalizedLevel = Math.max(0, Math.trunc(level));
    const rowLength = Math.max(1, count - normalizedLevel);
    const index = Math.min(rowLength - 1, Math.max(0, Math.trunc(pointIndex)));
    const center = (rowLength - 1) / 2;
    const distanceFromCenter = Math.abs(index - center);
    const ring = Math.floor(distanceFromCenter);
    const first = index === 0;
    const last = index === rowLength - 1;

    if (normalizedLevel >= count - 1) return {direction: 4, ring: 0};
    if (normalizedLevel === 1) {
        if (first) return {direction: 5, ring};
        if (last) return {direction: 4, ring};
        if (rowLength <= 4) return {direction: 0, ring};
        return {direction: index < center ? 7 : 1, ring};
    }
    if (normalizedLevel === 2) {
        if (first) return {direction: 5, ring};
        if (last) return {direction: 3, ring};
        if (distanceFromCenter === 0) return {direction: 2, ring};
        return {direction: index < center ? 7 : 1, ring};
    }
    return {direction: index < center ? 6 : 2, ring};
}

function constructionLabel(level: number, pointIndex: number, pointCount: number, compactBoard: () => boolean): NonNullable<PointAttributes["label"]> {
    const above = Math.abs(Math.trunc(level)) % 2 === 0;
    const distance = 0.55 + Math.floor(Math.abs(Math.trunc(level)) / 2) * 0.35;
    const layout = decasteljauLabelLayout(level, pointIndex, pointCount);
    const direction = compactLabelDirections[layout.direction];
    return dynamicAttributes<NonNullable<PointAttributes["label"]>>({
        ...pointStyle.label,
        anchorX: () => compactBoard() ? direction.anchorX : "middle",
        anchorY: () => compactBoard() ? direction.anchorY : above ? "bottom" : "top",
        offset: () => {
            if (compactBoard()) {
                const compactDistance = SizeContext.fontSize * (0.36 + layout.ring * 0.16);
                return [direction.x * compactDistance, direction.y * compactDistance] as [number, number];
            }
            return [0, (above ? -1 : 1) * SizeContext.fontSize * distance] as [number, number];
        }
    });
}

function resultPointStyle(level: number, pointIndex = 0, pointCount = 1, compactBoard: () => boolean = () => false): PointAttributes {
    return dynamicAttributes<PointAttributes>({
        ...pointStyle,
        name: "",
        fillColor: GraphPalette.constructionAccent,
        label: constructionLabel(level, pointIndex, pointCount, compactBoard)
    });
}

function constructionPointStyle(level: number, pointIndex = 0, pointCount = 1, compactBoard: () => boolean = () => false): PointAttributes {
    const color = constructionLevelColor(level);
    return dynamicAttributes<PointAttributes>({
        ...pointStyle,
        name: "",
        fillColor: color,
        label: constructionLabel(level, pointIndex, pointCount, compactBoard)
    });
}


function pi(i: number, visible: () => boolean): PointAttributes {
    return dynamicAttributes<PointAttributes>({
        ...pointStyle,
        name: "$$p_{" + i + "}$$",
        // name: "$$p_{\\scriptsize" + i + "}$$",
        visible: visible
    });
}

export const PointStyles = {
    pi: pi,
    default: pointStyle,
    hodograph: hodographPointStyle,
    fixed: fixedPointStyle,
    splineJoin: {...fixedPointStyle, fillColor: GraphPalette.splineJoin, highlightFillColor: GraphPalette.splineJoin},
    result: resultPointStyle,
    construction: constructionPointStyle
};


