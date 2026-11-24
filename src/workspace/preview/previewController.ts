// The hover preview of one board (task 06 slice 2): which parameter value a pointer rests on, and the ghost curves of it.
// It reads the graph (an `exportPreset()` snapshot, the shown view box) and holds copied arrays only: it makes no write and takes no lease.
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {Path} from '../../graphs/base/preview/paths';
import {sampledRange, type PreviewGeometry} from '../../graphs/base/preview/previewGeometry';

/** What the overlay draws: polylines in board coordinates and the box they were computed for (`[left, top, right, bottom]`). */
export interface Ghost {
    readonly paths: readonly Path[];
    readonly box: readonly number[];
}

export interface FrameScheduler {
    request(callback: () => void): number;
    cancel(handle: number): void;
}

const browserScheduler: FrameScheduler = {
    request: callback => requestAnimationFrame(callback),
    cancel: handle => cancelAnimationFrame(handle),
};

export class PreviewController {
    private ghost: Ghost | undefined;
    private readonly listeners = new Set<() => void>();
    private target: {key: string; value: number} | undefined;
    private snapshot: {version: number; scene: Parameters<PreviewGeometry>[0]} | undefined;
    private lastBox = '';
    private dirty = false;
    private handle = 0;

    constructor(private readonly graph: BaseGraph<BaseGraphState>, private readonly scheduler: FrameScheduler = browserScheduler) {}

    readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };

    readonly getGhost = (): Ghost | undefined => this.ghost;

    /** Previews `value` of the parameter `key`; nothing for a parameter that is not declared `previewable` or a graph without a geometry. */
    show(key: string, value: number): void {
        const parameter = this.graph.getDeclaration()?.parameters?.find(candidate => candidate.key === key);
        if (!parameter || (parameter.kind !== 'range' && parameter.kind !== 'count') || parameter.previewable !== true) return;
        if (!this.graph.getPreviewGeometry()) return;
        if (this.target?.key === key && this.target.value === value) return;
        this.target = {key, value};
        this.dirty = true;
        this.schedule();
    }

    /** Ends the preview: the ghost goes, the snapshot is dropped and no frame is pending. */
    hide(): void {
        this.target = undefined;
        this.snapshot = undefined;
        this.lastBox = '';
        this.dirty = false;
        if (this.handle) { this.scheduler.cancel(this.handle); this.handle = 0; }
        if (this.ghost) { this.ghost = undefined; this.emit(); }
    }

    private schedule(): void {
        if (!this.handle) this.handle = this.scheduler.request(this.tick);
    }

    /** The box the board shows: a fit's box while one runs, else the view intent. `setFitted` does not notify, so the loop reads it each frame. */
    private shownBox(): readonly number[] | undefined {
        const adapter = this.graph.mainViewAdapter;
        return adapter ? adapter.fitted() ?? adapter.intent().box : undefined;
    }

    // One frame: recompute only when the hovered value, the shown box or the scene changed, then look again next frame while a preview is held.
    private readonly tick = (): void => {
        this.handle = 0;
        const target = this.target;
        const geometry = this.graph.getPreviewGeometry();
        if (!target || !geometry) return;
        const box = this.shownBox();
        if (box) {
            const signature = box.join(',');
            const version = this.graph.store.getVersion();
            if (!this.snapshot || this.snapshot.version !== version) {
                this.snapshot = {version, scene: {state: this.graph.state, preset: this.graph.exportPreset()}};
                this.dirty = true;
            }
            if (this.dirty || signature !== this.lastBox) {
                this.dirty = false;
                this.lastBox = signature;
                const curves = geometry(this.snapshot.scene, target.key, target.value, sampledRange(box));
                this.ghost = {paths: Object.values(curves).flatMap(paths => paths.map(path => path.map(([x, y]): [number, number] => [x, y]))), box: [...box]};
                this.emit();
            }
        }
        this.schedule();
    };

    private emit(): void {
        for (const listener of [...this.listeners]) listener();
    }
}
