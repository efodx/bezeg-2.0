import {appStorage} from "../../../storage/appStorage";
import {capturePresetFigures, CapturedPresetFigure, downloadPresetFigures, FigureBatchOwner, FigureBatchRestoreError} from "./PresetFigureBatch";
import {FigureCaptureTarget} from "./FigureCapture";
import {FigureExportCancelledError} from "./FigureCapture";

interface TestPreset {id: string; data?: unknown}

function makeCanvas(blob: Blob): HTMLCanvasElement {
    return {toBlob: (callback: BlobCallback) => callback(blob)} as unknown as HTMLCanvasElement;
}

function makeOwner(events: string[], controller = new AbortController()) {
    let scene = "entry";
    const container = document.createElement("div");
    const owner: FigureBatchOwner<TestPreset, string> = {
        isAlive: () => !controller.signal.aborted,
        signal: controller.signal,
        waitUntilReady: async () => { events.push(`ready:${scene}`); },
        getCaptureTarget: (): FigureCaptureTarget => ({
            container,
            rendererRoot: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
            isAlive: () => !controller.signal.aborted,
            signal: controller.signal,
            waitUntilReady: async () => { events.push(`ready:${scene}`); },
        }),
        captureEntryState: () => {
            events.push(`save-entry:${scene}`);
            return scene;
        },
        applyPreset: preset => {
            scene = preset.id;
            events.push(`apply:${scene}`);
        },
        restoreEntryState: saved => {
            scene = saved;
            events.push(`restore:${scene}`);
        },
    };
    return {
        owner,
        controller,
        currentScene: () => scene,
        renderToCanvas: async () => {
            events.push(`capture:${scene}`);
            return makeCanvas(new Blob([scene], {type: "image/png"}));
        },
    };
}

test("preset figures capture in order, restore the entry scene, and keep blobs local to the ZIP job", async () => {
    const events: string[] = [];
    const fixture = makeOwner(events);
    const archive = new Blob(["zip"], {type: "application/zip"});
    const createZip = vi.fn(async (figures: readonly CapturedPresetFigure[]) => {
        events.push(`zip:${fixture.currentScene()}`);
        expect(figures.map(figure => figure.filename)).toEqual(["first.png", "second.png"]);
        return archive;
    });
    const download = vi.fn();
    const storageWrite = vi.spyOn(appStorage, "setItem");

    try {
        await downloadPresetFigures(fixture.owner, [{id: "first"}, {id: "second"}], {
            renderToCanvas: fixture.renderToCanvas,
            createZip,
            download,
        });

        expect(events.indexOf("apply:first")).toBeLessThan(events.indexOf("capture:first"));
        expect(events.indexOf("capture:first")).toBeLessThan(events.indexOf("apply:second"));
        expect(events.indexOf("apply:second")).toBeLessThan(events.indexOf("capture:second"));
        expect(events.indexOf("capture:second")).toBeLessThan(events.indexOf("restore:entry"));
        expect(events.indexOf("restore:entry")).toBeLessThan(events.indexOf("zip:entry"));
        expect(fixture.currentScene()).toBe("entry");
        expect(download).toHaveBeenCalledWith(archive, "slike.zip");
        expect(storageWrite).not.toHaveBeenCalled();
    } finally {
        storageWrite.mockRestore();
    }
});

test("a failed preset still restores the entry scene and does not create a download", async () => {
    const events: string[] = [];
    const fixture = makeOwner(events);
    const apply = fixture.owner.applyPreset;
    const restore = fixture.owner.restoreEntryState;
    fixture.owner.applyPreset = (preset, operationSignal) => {
        apply(preset, operationSignal);
        throw new Error("preset apply failed");
    };
    fixture.owner.restoreEntryState = (scene, operationSignal) => {
        events.push(`restore:${scene}`);
        return restore(scene, operationSignal);
    };
    const createZip = vi.fn(async () => new Blob(["zip"]));
    const download = vi.fn();

    await downloadPresetFigures(fixture.owner, [{id: "broken"}], {
        renderToCanvas: fixture.renderToCanvas,
        createZip,
        download,
    });

    expect(fixture.currentScene()).toBe("entry");
    expect(events).toContain("restore:entry");
    expect(createZip).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
});

test("a restoration failure is surfaced after an earlier capture error", async () => {
    const events: string[] = [];
    const fixture = makeOwner(events);
    const apply = fixture.owner.applyPreset;
    fixture.owner.applyPreset = (preset, operationSignal) => {
        apply(preset, operationSignal);
        throw new Error("capture stopped");
    };
    fixture.owner.restoreEntryState = () => {
        throw new Error("restore stopped");
    };
    await expect(capturePresetFigures(fixture.owner, [{id: "partial"}], {
        renderToCanvas: fixture.renderToCanvas,
    })).rejects.toBeInstanceOf(FigureBatchRestoreError);

    expect(fixture.currentScene()).toBe("partial");
});

test("disposal during ZIP creation prevents a stale batch download", async () => {
    const events: string[] = [];
    const fixture = makeOwner(events);
    const download = vi.fn();

    await downloadPresetFigures(fixture.owner, [{id: "first"}], {
        renderToCanvas: fixture.renderToCanvas,
        createZip: async () => {
            fixture.controller.abort();
            return new Blob(["late zip"]);
        },
        download,
    });

    expect(fixture.currentScene()).toBe("entry");
    expect(events).toContain("restore:entry");
    expect(download).not.toHaveBeenCalled();
});

test("same-session batches are serialized and a disposed owner aborts the pending scene operation", async () => {
    const events: string[] = [];
    const fixture = makeOwner(events);
    let signalApplyStarted: () => void = () => undefined;
    const applyStarted = new Promise<void>(resolve => { signalApplyStarted = resolve; });
    fixture.owner.applyPreset = (_preset, operationSignal) => new Promise<void>(resolve => {
        signalApplyStarted();
        operationSignal.addEventListener("abort", () => resolve(), {once: true});
    });

    const pending = capturePresetFigures(fixture.owner, [{id: "pending"}], {
        renderToCanvas: fixture.renderToCanvas,
    });
    await applyStarted;
    await expect(capturePresetFigures(fixture.owner, [{id: "interleaved"}], {
        renderToCanvas: fixture.renderToCanvas,
    })).rejects.toThrow("already active");

    fixture.controller.abort();
    await expect(pending).rejects.toBeInstanceOf(FigureExportCancelledError);
});
