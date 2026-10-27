/**
 * Test support: a `SurfaceView` that records what the graph tells it, so no WebGL or Three is loaded. Shared by the
 * patch graph tests and the real-graph transient-state harness.
 */
import {act} from "@testing-library/react";
import type {AttachOptions, LabelLayout, SurfaceCapture, SurfaceEdit, SurfaceScene, SurfaceView} from "./surface-view/surfaceScene";

export class FakeSurfaceView implements SurfaceView {
    scenes: SurfaceScene[] = [];
    disposed = 0;
    labels: string[] = [];
    attached?: HTMLElement;
    /** What `capture()` returns; unset, it rejects. */
    captureResult?: SurfaceCapture;
    captures = 0;
    /** Mirrors the real view's layout subscription; `emitLayout` is a render with a new layout. */
    layoutListeners = new Set<(labels: LabelLayout[]) => void>();
    private listeners = new Set<(edit: SurfaceEdit) => void>();
    constructor(private readonly attachResult: Promise<void> = Promise.resolve()) {}
    attach(host: HTMLElement, options?: AttachOptions): Promise<void> {
        this.attached = host;
        this.labels.push(options?.ariaLabel ?? "");
        return this.attachResult;
    }
    reconcile(scene: SurfaceScene): void { this.scenes.push(scene); }
    onEdit(listener: (edit: SurfaceEdit) => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
    setAriaLabel(label: string): void { this.labels.push(label); }
    onLayout(listener: (labels: LabelLayout[]) => void): () => void { this.layoutListeners.add(listener); return () => { this.layoutListeners.delete(listener); }; }
    capture(): Promise<SurfaceCapture> {
        this.captures++;
        return this.captureResult ? Promise.resolve(this.captureResult) : Promise.reject(new Error("not used"));
    }
    emitLayout(labels: LabelLayout[]): void { [...this.layoutListeners].forEach(listener => listener(labels)); }
    fitCamera(): void {}
    dispose(): void { this.disposed++; }
    /** A user gesture in the view: the graph applies it (inside `act`, like any user event). */
    emit(edit: SurfaceEdit): void { act(() => this.listeners.forEach(listener => listener(edit))); }
    get last(): SurfaceScene { return this.scenes[this.scenes.length - 1]; }
}

const r = (value: number): number => Math.round(value * 1e6) / 1e6;
const xyz = (p: readonly number[]): string => p.map(r).join(",");

/**
 * What a surface view shows, one line per drawn object (sorted): points with selection, each polyline's role, size and
 * five samples, markers, labels, the mesh's size and samples, and the interaction mode. The revision counter is
 * left out (it is bookkeeping, not scene state); the camera is compared separately as the observation's `view`.
 */
export function sceneSignature(scene: SurfaceScene | undefined): string[] {
    if (!scene) return [];
    const lines: string[] = [];
    for (const p of scene.points) lines.push(`point ${p.id} ${xyz(p.xyz)}${p.selected ? " selected" : ""}`);
    for (const line of scene.polylines) {
        const n = line.points.length;
        const at = [0, 0.25, 0.5, 0.75, 1].map(fraction => Math.round(fraction * (n - 1)));
        lines.push(`polyline ${line.id} ${line.role} n=${n} ${n === 0 ? "" : at.map(i => xyz(line.points[i])).join(" ")}`);
    }
    for (const m of scene.markers) lines.push(`marker ${m.id} ${m.role} ${xyz(m.xyz)}`);
    for (const l of scene.labels) lines.push(`label ${l.id} ${l.text} ${xyz(l.anchor)}${l.pointId ? ` ${l.pointId}` : ""}`);
    if (scene.mesh) {
        const positions = Array.from(scene.mesh.positions);
        const last = positions.length - 3;
        lines.push(`mesh ${scene.mesh.visible ? "visible" : "hidden"} v=${positions.length / 3} f=${scene.mesh.faces.length / 3}`
            + (positions.length > 0 ? ` ${xyz(positions.slice(0, 3))} ${xyz(positions.slice(last))}` : ""));
    }
    lines.push(`interaction zMode=${scene.interaction.zMode} editable=${scene.interaction.editable}`);
    return lines.sort();
}

export const cameraSignature = (scene: SurfaceScene | undefined) => scene
    ? {az: r(scene.camera.az), el: r(scene.camera.el), distance: r(scene.camera.distance), projection: scene.camera.projection, target: scene.camera.target.map(r)}
    : null;
