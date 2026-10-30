import {JsxSurfaceView} from './jsxSurfaceView';
import type {SurfaceView} from './surfaceScene';

/** The view the patch graphs create unless a test passes its own. */
export function createDefaultSurfaceView(): SurfaceView {
    return new JsxSurfaceView();
}
