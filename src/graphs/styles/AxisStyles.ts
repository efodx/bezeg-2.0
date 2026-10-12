import {AxisAttributes, TicksOptions} from "jsxgraph";
import type {DisplaySettings} from "../base/DisplaySettings";
import {GraphPalette} from "./GraphPalette";
import {dynamicAttributes} from "./dynamicAttributes";

/** Axis attribute presets whose callbacks read the display settings of one graph. */
export function createAxisStyles(settings: DisplaySettings) {
    const tick = dynamicAttributes<TicksOptions>({
        visible: () => settings.ticksVisible(),
        strokeColor: GraphPalette.tick,
        highlightStrokeColor: GraphPalette.tick,
        strokeWidth: () => Math.max(0.75, settings.strokeWidth * 0.38),
        highlightStrokeWidth: () => Math.max(0.75, settings.strokeWidth * 0.38),
        // majorHeight: () => settings.majorHeight,
        minorHeight: () => settings.minorHeight * (settings.minorVisible() ? 1 : 0),
        label: {
            fontSize: () => settings.fontSize * 0.6,
            visible: () => settings.tickNumbersVisible(),
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
            strokeWidth: () => Math.max(1, settings.strokeWidth * 0.62),
            strokeColor: GraphPalette.axis,
            highlightStrokeColor: GraphPalette.axis,
            visible: () => settings.axisVisible(),
            ticks: tick,
            lastArrow: false
        });
    }

    const auxiliaryTick = dynamicAttributes<TicksOptions>({
        strokeColor: GraphPalette.tick,
        highlightStrokeColor: GraphPalette.tick,
        strokeWidth: () => Math.max(0.75, settings.strokeWidth * 0.38),
        highlightStrokeWidth: () => Math.max(0.75, settings.strokeWidth * 0.38)
    });

    function auxiliaryAxisStyle(): AxisAttributes {
        return dynamicAttributes<AxisAttributes>({
            strokeWidth: () => Math.max(1, settings.strokeWidth * 0.62),
            strokeColor: GraphPalette.axis,
            highlightStrokeColor: GraphPalette.axis,
            ticks: auxiliaryTick
        });
    }

    return {
        defaultX: axisStyle(tickX),
        defaultY: axisStyle(tickY),
        auxiliaryX: auxiliaryAxisStyle(),
        auxiliaryY: auxiliaryAxisStyle()
    };
}

export type AxisStyleSet = ReturnType<typeof createAxisStyles>;
