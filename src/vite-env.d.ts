/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
    /** Build-time surface view for the Bezier patch routes: `three` (default), `jsx-view3d` or `jsx-board2d`. */
    readonly VITE_SURFACE_VIEW?: "three" | "jsx-view3d" | "jsx-board2d";
}
