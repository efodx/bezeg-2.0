/**
 * Test-only page for scripts/preview-measure (task 02 slice 5a). Served by the Vite dev server at /bezeg-2.0/fixtures/preview/.
 * Mounts one live graph at a time on a visible container and exposes `window.__preview`: option A (pure geometry from the
 * snapshot) and option B (a hidden shadow graph, cold or warm) for Taylor, De Casteljau and the phase portrait.
 */
import type {Preset} from '../../src/graphs/base/presets/Presets';
import {previewSubjects, type PreviewSubject} from '../../src/graphs/base/preview/experiment/subjects';
import {captureOnOpenShadow, captureShadow, closeShadow, liveBoardCount, openShadow, shadowView, type Shadow} from '../../src/graphs/base/preview/experiment/shadowBoard';

const subjectOf = (id: string): PreviewSubject => {
    const found = previewSubjects.find(candidate => candidate.id === id);
    if (!found) throw new Error(`unknown subject ${id}`);
    return found;
};

let live: {subject: PreviewSubject; graph: ReturnType<PreviewSubject['create']>; snapshot: Preset} | undefined;
let warm: Shadow | undefined;

/** Pure paths do not leave the page: a result is reduced to its point count so a call costs the preview, not a transfer. */
const size = (paths: Record<string, unknown[][]>): number => Object.values(paths).reduce((sum, list) => sum + list.reduce((s, path) => s + path.length, 0), 0);

const api = {
    subjects: () => previewSubjects.map(({id, parameter, values}) => ({id, parameter, values})),
    /** Mounts the live graph of a subject and takes the snapshot a preview starts from. */
    open(id: string): void {
        api.close();
        const subject = subjectOf(id);
        const graph = subject.create();
        graph.mount(document.getElementById('live') as HTMLElement);
        live = {subject, graph, snapshot: graph.exportPreset()};
    },
    close(): void {
        if (warm) { closeShadow(warm); warm = undefined; }
        if (live) { live.graph.unmount(); live = undefined; }
    },
    /** Option A. The x range is the live board's, as a preview over the same view would use. */
    geometry(value: number): number {
        const {subject, graph, snapshot} = live!;
        const view = shadowView({graph, host: document.body as unknown as HTMLDivElement});
        return size(subject.geometry(snapshot, value, view));
    },
    /** Option B cold: build the shadow, load, read, dispose. */
    captureShadow(value: number): number {
        return size(captureShadow(live!.subject, live!.snapshot, value));
    },
    /** Option B warm: a shadow that stays open while the value moves. */
    openWarm(): void { warm = openShadow(live!.subject); },
    warm(value: number): number {
        return size(captureOnOpenShadow(live!.subject, warm!, live!.snapshot, value));
    },
    closeWarm(): void { if (warm) { closeShadow(warm); warm = undefined; } },
    boards: liveBoardCount,
};

(window as unknown as {__preview: typeof api}).__preview = api;
