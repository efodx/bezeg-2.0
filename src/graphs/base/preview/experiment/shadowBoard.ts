/**
 * Preview experiment, option B (docs/specs/parameter-writes.md "Previews"): a shadow graph. A second instance of the same
 * graph class is mounted on a hidden container, loaded from a snapshot (`exportPreset()` of the live graph, edited with the
 * previewed value), and its drawn paths are read. The live graph is only read, never written. Disposal is `unmount()`, which
 * disposes the session (board, listeners, timers, objects), and the removal of the container.
 *
 * No React host commits for a shadow, so the pending state changes of the load are flushed by hand.
 */
import JXG from 'jsxgraph';
import {runAs} from '../../writes/writeSource';
import type BaseGraph from '../../BaseGraph';
import type {BaseGraphState} from '../../BaseGraph';
import type {Preset} from '../../presets/Presets';
import {sampledRange, type PreviewPaths, type PreviewSubject, type PreviewView} from './subjects';

export interface Shadow {
    readonly graph: BaseGraph<BaseGraphState>;
    readonly host: HTMLDivElement;
}

/** JSXGraph boards alive now (a leak shows as a count that does not return to its value before a capture). */
export const liveBoardCount = (): number => Object.keys(JXG.boards as Record<string, unknown>).length;

/** Builds a graph on a hidden 600x400 container (off screen, laid out, not `display: none`, so JSXGraph measures it). */
export function openShadow(subject: PreviewSubject): Shadow {
    const host = document.createElement('div');
    host.setAttribute('data-preview-shadow', subject.id);
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;height:400px;visibility:hidden;pointer-events:none;';
    document.body.appendChild(host);
    try {
        const graph = subject.create();
        graph.mount(host);
        return {graph, host};
    } catch (error) {
        host.remove();
        throw error;
    }
}

/** Loads a snapshot into the shadow and draws it. */
export function loadSnapshot(shadow: Shadow, snapshot: Preset): void {
    // Not an app bug: the app never calls `importPreset` on a mounted board bare, it wraps it in `replaceScene`, which disposes
    // first for curve families (`disposesBeforeNonFigureImport`). A bare import adds to the scene, so do that disposal here.
    if (shadow.graph['disposesBeforeNonFigureImport']()) {
        shadow.graph['disposeFigureScene']();
        shadow.graph['sceneSlot']?.release();
    }
    // The shadow is a graph of its own: its writes are the preview's, tagged like a learner's load of a Preset.
    runAs('learner', () => shadow.graph.importPreset(snapshot));
    shadow.graph.flushStateChanges();
    (shadow.graph['board'] as JXG.Board).update();
}

/** Disposes the shadow completely: the graph session (board and everything attached) and the container. Safe to call twice. */
export function closeShadow(shadow: Shadow): void {
    shadow.graph.unmount();
    shadow.host.remove();
}

/** The x range the shadow's function graphs are sampled over, for the pure geometry of option A to draw over the same range. */
export const shadowView = (shadow: Shadow): PreviewView => sampledRange((shadow.graph['board'] as JXG.Board).getBoundingBox());

/** Cold capture: build the shadow, load the edited snapshot, read the paths, dispose. */
export function captureShadow(subject: PreviewSubject, snapshot: Preset, value: number): PreviewPaths {
    const shadow = openShadow(subject);
    try {
        loadSnapshot(shadow, subject.withValue(snapshot, value));
        return subject.readPaths(shadow.graph);
    } finally {
        closeShadow(shadow);
    }
}

/** Warm capture: reuse a shadow that is already built (a preview that keeps its board while the value moves). */
export function captureOnOpenShadow(subject: PreviewSubject, shadow: Shadow, snapshot: Preset, value: number): PreviewPaths {
    loadSnapshot(shadow, subject.withValue(snapshot, value));
    return subject.readPaths(shadow.graph);
}
