import {AxisAttributes, TicksOptions} from "jsxgraph";
import {SizeContext} from "../context/SizeContext";
import {AxisContext} from "../context/AxisContext";
import {GraphPalette} from "./GraphPalette";

const tick: TicksOptions = {
    // @ts-ignore
    visible: () => AxisContext.ticksVisible(),
    // @ts-ignore
    strokeColor: GraphPalette.tick,
    // @ts-ignore
    highlightStrokeColor: GraphPalette.tick,
    // @ts-ignore
    strokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38),
    // @ts-ignore
    highlightStrokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38),
    // @ts-ignore
    // majorHeight: () => Contexts.majorHeight,
    // @ts-ignore
    minorHeight: () => SizeContext.minorHeight * AxisContext.minorVisible(),
    label: {
        // @ts-ignore
        fontSize: () => SizeContext.fontSize * 0.6,
        // @ts-ignore
        visible: () => AxisContext.tickNumbersVisible(),
        parse: false,
        useMathJax: true,
        cssStyle: `font-family: MJXZERO, MJXTEX; color: ${GraphPalette.label}`,
        // @ts-ignore
        display: 'html'
    },
};

const tickX: TicksOptions = tick;

const tickY: TicksOptions = {
    ...tick,
    label: {
        ...tick.label,
        // @ts-ignore
        offset: [-10, -5]
    }
};

function axisStyle(tick: TicksOptions): AxisAttributes {
    return {
        strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.62),
        strokeColor: GraphPalette.axis,
        highlightStrokeColor: GraphPalette.axis,
        visible: () => AxisContext.axisVisible(),
        ticks: tick,
        lastArrow: false
    };
}


const auxiliaryTick: TicksOptions = {
    strokeColor: GraphPalette.tick,
    highlightStrokeColor: GraphPalette.tick,
    // @ts-ignore JSXGraph evaluates callback-valued style attributes at render time.
    strokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38),
    // @ts-ignore
    highlightStrokeWidth: () => Math.max(0.75, SizeContext.strokeWidth * 0.38)
};

function auxiliaryAxisStyle(): AxisAttributes {
    return {
        strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.62),
        strokeColor: GraphPalette.axis,
        highlightStrokeColor: GraphPalette.axis,
        ticks: auxiliaryTick
    };
}

export const AxisStyles = {
    defaultX: axisStyle(tickX),
    defaultY: axisStyle(tickY),
    auxiliaryX: auxiliaryAxisStyle(),
    auxiliaryY: auxiliaryAxisStyle()
};
