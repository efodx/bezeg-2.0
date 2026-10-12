import {AxisAttributes, TicksOptions} from "jsxgraph";
import {SizeContext} from "../context/SizeContext";
import {AxisContext} from "../context/AxisContext";
import {GraphPalette} from "./GraphPalette";
import {dynamicAttributes} from "./dynamicAttributes";

const tick = dynamicAttributes<TicksOptions>({
    visible: () => AxisContext.ticksVisible(),
    strokeColor: GraphPalette.tick,
    highlightStrokeColor: GraphPalette.tick,
    strokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38),
    highlightStrokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38),
    // majorHeight: () => Contexts.majorHeight,
    minorHeight: () => SizeContext.minorHeight * (AxisContext.minorVisible() ? 1 : 0),
    label: {
        fontSize: () => SizeContext.fontSize * 0.6,
        visible: () => AxisContext.tickNumbersVisible(),
        parse: false,
        useMathJax: true,
        cssStyle: `font-family: MJXZERO, MJXTEX; color: ${GraphPalette.label}`,
        // @ts-ignore The bundled typings restrict LabelOptions.display to 'internal'; JSXGraph also accepts 'html'.
        display: 'html'
    },
});

const tickX: TicksOptions = tick;

const tickY = dynamicAttributes<TicksOptions>({
    ...tick,
    label: {
        ...tick.label,
        offset: [-10, -5]
    }
});

function axisStyle(tick: TicksOptions): AxisAttributes {
    return dynamicAttributes<AxisAttributes>({
        strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.62),
        strokeColor: GraphPalette.axis,
        highlightStrokeColor: GraphPalette.axis,
        visible: () => AxisContext.axisVisible(),
        ticks: tick,
        lastArrow: false
    });
}


const auxiliaryTick = dynamicAttributes<TicksOptions>({
    strokeColor: GraphPalette.tick,
    highlightStrokeColor: GraphPalette.tick,
    strokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38),
    highlightStrokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38)
});

function auxiliaryAxisStyle(): AxisAttributes {
    return dynamicAttributes<AxisAttributes>({
        strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.62),
        strokeColor: GraphPalette.axis,
        highlightStrokeColor: GraphPalette.axis,
        ticks: auxiliaryTick
    });
}

export const AxisStyles = {
    defaultX: axisStyle(tickX),
    defaultY: axisStyle(tickY),
    auxiliaryX: auxiliaryAxisStyle(),
    auxiliaryY: auxiliaryAxisStyle()
};
