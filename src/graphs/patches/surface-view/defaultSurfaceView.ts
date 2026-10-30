import {JsxSurfaceView} from './jsxSurfaceView';
import {ThreeSurfaceView} from './threeSurfaceView';
import type {SurfaceView} from './surfaceScene';

/** The view the patch graphs create unless a test passes its own: chosen at build time with `VITE_SURFACE_VIEW`. */
export function createDefaultSurfaceView(kind: string | undefined = import.meta.env.VITE_SURFACE_VIEW): SurfaceView {
    if (kind === 'jsx-board2d') return new JsxSurfaceView();
    return new ThreeSurfaceView();
}
