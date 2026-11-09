// @vitest-environment jsdom
import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {t} from "../../localization";
import {azimuthDegrees, SurfaceCameraPanel} from "./SurfaceCameraPanel";
import {CAMERA_PRESETS} from "./surface-view/surfaceMath";

const actions = () => ({applyCameraPreset: vi.fn(), resetView: vi.fn(), setCameraAngle: vi.fn()});

describe("SurfaceCameraPanel", () => {
    it("the four preset buttons and Reset view call their actions", () => {
        const a = actions();
        render(<SurfaceCameraPanel camera={{az: 0, el: 0}} actions={a}/>);
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_front")}));
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_top")}));
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_side")}));
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_isometric")}));
        expect(a.applyCameraPreset.mock.calls).toEqual([["front"], ["top"], ["side"], ["isometric"]]);
        fireEvent.click(screen.getByRole("button", {name: t("patch_view_reset")}));
        expect(a.resetView).toHaveBeenCalledTimes(1);
    });

    it("the sliders show the camera in degrees with the elevation limited to the top view, and write degrees back", () => {
        const a = actions();
        render(<SurfaceCameraPanel camera={{az: Math.PI * 2.5, el: 0.5}} actions={a}/>);
        const az = screen.getByLabelText<HTMLInputElement>(t("patch_camera_azimuth"));
        const el = screen.getByLabelText<HTMLInputElement>(t("patch_camera_elevation"));
        expect(Number(az.value)).toBeCloseTo(90, 10);
        expect([az.min, az.max]).toEqual(["-180", "180"]);
        expect(Number(el.value)).toBeCloseTo(0.5 * 180 / Math.PI, 10);
        expect(Number(el.max)).toBeCloseTo(CAMERA_PRESETS.top.el * 180 / Math.PI, 10);
        expect(Number(el.min)).toBeCloseTo(-Number(el.max), 10);
        fireEvent.change(az, {target: {value: "45"}});
        expect(a.setCameraAngle).toHaveBeenCalledWith("az", 45);
        fireEvent.change(el, {target: {value: "30"}});
        expect(a.setCameraAngle).toHaveBeenCalledWith("el", 30);
    });

    it("wraps the azimuth to [-180, 180) and puts the extra slot after the sliders", () => {
        expect(azimuthDegrees(-Math.PI * 1.5)).toBeCloseTo(90, 10);
        expect(azimuthDegrees(0)).toBe(0);
        render(<SurfaceCameraPanel camera={{az: 0, el: 0}} actions={actions()}><p data-testid="extra">extra</p></SurfaceCameraPanel>);
        const elevation = screen.getByLabelText(t("patch_camera_elevation"));
        expect(elevation.compareDocumentPosition(screen.getByTestId("extra")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
