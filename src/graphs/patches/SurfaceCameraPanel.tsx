import type {ReactNode} from "react";
import {Button} from "react-bootstrap";
import Slider from "../../inputs/Slider";
import {useT} from "../../localization";
import {CAMERA_PRESETS, type CameraPresetName} from "./surface-view/surfaceMath";

const radToDeg = (radians: number) => radians * 180 / Math.PI;
/** The azimuth in degrees, wrapped to [-180, 180) so repeated orbiting stays on the slider. */
export const azimuthDegrees = (radians: number) => ((radToDeg(radians) + 180) % 360 + 360) % 360 - 180;
const MAX_ELEVATION_DEGREES = radToDeg(CAMERA_PRESETS.top.el);

export interface SurfaceCameraActions {
    applyCameraPreset(name: CameraPresetName): void;
    resetView(): void;
    setCameraAngle(angle: "az" | "el", degrees: number): void;
}

/** The "View" group shared by the surface graphs: four preset views, Reset view and the orbit angles in degrees. `children` follow the sliders. */
export function SurfaceCameraPanel({camera, actions, children}: {
    /** Orbit angles in radians. */
    camera: {az: number; el: number}; actions: SurfaceCameraActions; children?: ReactNode;
}) {
    const t = useT();
    return <div className="inspector-group"><h3>{t("patch_camera_heading")}</h3>
        <div className="workspace-curve-picker workspace-view-buttons">
            <Button onClick={() => actions.applyCameraPreset("front")}>{t("patch_view_front")}</Button>
            <Button onClick={() => actions.applyCameraPreset("top")}>{t("patch_view_top")}</Button>
            <Button onClick={() => actions.applyCameraPreset("side")}>{t("patch_view_side")}</Button>
            <Button onClick={() => actions.applyCameraPreset("isometric")}>{t("patch_view_isometric")}</Button>
            <Button onClick={() => actions.resetView()}>{t("patch_view_reset")}</Button>
        </div>
        <Slider customText={t("patch_camera_azimuth")} min={-180} max={180} step={1} decimals={0} value={azimuthDegrees(camera.az)}
                onChange={degrees => actions.setCameraAngle("az", degrees)}/>
        <Slider customText={t("patch_camera_elevation")} min={-MAX_ELEVATION_DEGREES} max={MAX_ELEVATION_DEGREES} step={1} decimals={1}
                value={radToDeg(camera.el)} onChange={degrees => actions.setCameraAngle("el", degrees)}/>
        {children}
    </div>;
}
