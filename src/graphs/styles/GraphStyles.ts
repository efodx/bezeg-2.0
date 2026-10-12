import type {Board} from "jsxgraph";
import {DisplaySettings} from "../base/DisplaySettings";
import {graphSessionForBoard} from "../base/GraphSession";
import {AxisStyleSet, createAxisStyles} from "./AxisStyles";
import {createCurveStyles, CurveStyleSet} from "./CurveStyles";
import {createPointStyles, PointStyleSet} from "./PointStyles";
import {createSegmentStyles, SegmentStyleSet} from "./SegmentStyles";

/** The style presets of one graph. Their callbacks read that graph's `DisplaySettings` when JSXGraph draws. */
export interface GraphStyles {
    point: PointStyleSet;
    curve: CurveStyleSet;
    segment: SegmentStyleSet;
    axis: AxisStyleSet;
}

const stylesBySettings = new WeakMap<DisplaySettings, GraphStyles>();

/** Style presets bound to `settings`; the same object is returned for the same settings. */
export function stylesFor(settings: DisplaySettings): GraphStyles {
    let styles = stylesBySettings.get(settings);
    if (!styles) {
        styles = {
            point: createPointStyles(settings),
            curve: createCurveStyles(settings),
            segment: createSegmentStyles(settings),
            axis: createAxisStyles(settings),
        };
        stylesBySettings.set(settings, styles);
    }
    return styles;
}

/**
 * The display settings of the graph that owns `board`. A board without a session (a bare test board) gets
 * default settings of its own.
 */
export function settingsForBoard(board: Board): DisplaySettings {
    const session = graphSessionForBoard(board);
    if (session) return session.displaySettings;
    let settings = settingsByUnownedBoard.get(board);
    if (!settings) {
        settings = new DisplaySettings();
        settingsByUnownedBoard.set(board, settings);
    }
    return settings;
}

const settingsByUnownedBoard = new WeakMap<Board, DisplaySettings>();

/** Style presets for the graph that owns `board`. */
export function stylesForBoard(board: Board): GraphStyles {
    return stylesFor(settingsForBoard(board));
}
