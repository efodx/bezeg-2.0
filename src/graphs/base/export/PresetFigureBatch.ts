import JSZip from "jszip";
import {
    capturePNGBlob,
    downloadBlob,
    FigureCaptureDependencies,
    FigureCaptureTarget,
    FigureExportCancelledError,
    FigureExportLifecycle,
    isFigureExportCancelled,
    runBatchFigureExport,
    waitForFigureCaptureReady,
    waitForOwnedFigureWork,
} from "./FigureCapture";

export interface FigurePresetLike {
    id: string;
}

/**
 * The graph owner applies and restores complete scenes, including any
 * graph-specific objects that must be rebuilt. Its readiness callback covers
 * model updates and renderer work for the current scene.
 */
export interface FigureBatchOwner<Preset extends FigurePresetLike, Scene> extends FigureExportLifecycle {
    getCaptureTarget: () => FigureCaptureTarget;
    captureEntryState: () => Scene | Promise<Scene>;
    /** Implementations must stop queued scene mutations when this signal aborts. */
    applyPreset: (preset: Preset, operationSignal: AbortSignal) => void | Promise<void>;
    /** Implementations must stop queued scene mutations when this signal aborts. */
    restoreEntryState: (scene: Scene, operationSignal: AbortSignal) => void | Promise<void>;
}

export interface CapturedPresetFigure {
    filename: string;
    blob: Blob;
}

export interface PresetFigureBatchDependencies extends FigureCaptureDependencies {
    createZip?: (figures: readonly CapturedPresetFigure[]) => Promise<Blob>;
}

export class FigureBatchRestoreError extends Error {
    constructor(readonly exportError: unknown, readonly restoreError: unknown) {
        super("The entry scene could not be restored after figure export.");
        this.name = "FigureBatchRestoreError";
    }
}

function assertOwnerAlive(owner: FigureExportLifecycle): void {
    if (owner.signal.aborted || !owner.isAlive()) {
        throw new FigureExportCancelledError();
    }
}

function getCurrentTarget<Preset extends FigurePresetLike, Scene>(
    owner: FigureBatchOwner<Preset, Scene>
): FigureCaptureTarget {
    assertOwnerAlive(owner);
    const target = owner.getCaptureTarget();
    if (target.signal !== owner.signal) {
        throw new Error("The capture target must belong to the active batch graph session.");
    }
    return target;
}

const activeOwnerBatches = new WeakSet<AbortSignal>();

function withOwnerBatchLock<T, Preset extends FigurePresetLike, Scene>(
    owner: FigureBatchOwner<Preset, Scene>,
    operation: () => Promise<T>,
): Promise<T> {
    if (activeOwnerBatches.has(owner.signal)) {
        return Promise.reject(new Error("A figure batch is already active for this graph session."));
    }
    activeOwnerBatches.add(owner.signal);
    try {
        return Promise.resolve(operation()).finally(() => activeOwnerBatches.delete(owner.signal));
    } catch (error) {
        activeOwnerBatches.delete(owner.signal);
        return Promise.reject(error);
    }
}

/**
 * Captures one PNG per preset, keeping every blob local to this operation. The
 * entry scene is restored before this function returns or rethrows an error.
 */
async function capturePresetFiguresUnlocked<Preset extends FigurePresetLike, Scene>(
    owner: FigureBatchOwner<Preset, Scene>,
    presets: readonly Preset[],
    dependencies: PresetFigureBatchDependencies = {}
): Promise<CapturedPresetFigure[]> {
    const entryTarget = getCurrentTarget(owner);
    await waitForFigureCaptureReady(entryTarget);
    const entryScene = await waitForOwnedFigureWork(
        () => Promise.resolve(owner.captureEntryState()),
        owner,
        "the entry scene to be saved"
    );
    const figures: CapturedPresetFigure[] = [];
    let exportError: unknown;

    try {
        for (const preset of presets) {
            await waitForOwnedFigureWork(
                operationSignal => Promise.resolve(owner.applyPreset(preset, operationSignal)),
                owner,
                `preset ${preset.id} to be applied`
            );
            await waitForOwnedFigureWork(owner.waitUntilReady(), owner, `preset ${preset.id} to become ready`);
            const target = getCurrentTarget(owner);
            const blob = await capturePNGBlob(target, dependencies);
            figures.push({filename: `${preset.id}.png`, blob});
        }
    } catch (error) {
        exportError = error;
    }

    let restoreError: unknown;
    if (!owner.signal.aborted && owner.isAlive()) {
        try {
            await waitForOwnedFigureWork(
                operationSignal => Promise.resolve(owner.restoreEntryState(entryScene, operationSignal)),
                owner,
                "the entry scene to be restored"
            );
            await waitForOwnedFigureWork(owner.waitUntilReady(), owner, "the restored scene to become ready");
        } catch (error) {
            restoreError = error;
        }
    }

    if (restoreError instanceof FigureExportCancelledError) throw restoreError;
    if (restoreError !== undefined) {
        throw new FigureBatchRestoreError(exportError, restoreError);
    }
    if (exportError !== undefined) throw exportError;
    assertOwnerAlive(owner);
    return figures;
}

export function capturePresetFigures<Preset extends FigurePresetLike, Scene>(
    owner: FigureBatchOwner<Preset, Scene>,
    presets: readonly Preset[],
    dependencies: PresetFigureBatchDependencies = {},
): Promise<CapturedPresetFigure[]> {
    return withOwnerBatchLock(owner, () => capturePresetFiguresUnlocked(owner, presets, dependencies));
}

async function createZipDefault(figures: readonly CapturedPresetFigure[]): Promise<Blob> {
    const zip = new JSZip();
    figures.forEach(figure => zip.file(figure.filename, figure.blob));
    return zip.generateAsync({type: "blob"});
}

/** Captures selected presets and downloads the existing `slike.zip` output. */
export function downloadPresetFigures<Preset extends FigurePresetLike, Scene>(
    owner: FigureBatchOwner<Preset, Scene>,
    presets: readonly Preset[],
    dependencies: PresetFigureBatchDependencies = {}
): Promise<void> {
    return runBatchFigureExport(async () => {
        await withOwnerBatchLock(owner, async () => {
            const figures = await capturePresetFiguresUnlocked(owner, presets, dependencies);
            const createZip = dependencies.createZip ?? createZipDefault;
            const archive = await waitForOwnedFigureWork(
                createZip(figures),
                owner,
                "the preset figure archive to be created"
            );
            await waitForOwnedFigureWork(Promise.resolve(), owner, "the graph session to remain active");
            (dependencies.download ?? downloadBlob)(archive, "slike.zip");
        });
    });
}

export {isFigureExportCancelled};
