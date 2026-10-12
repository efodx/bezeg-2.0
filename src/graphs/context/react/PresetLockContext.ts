import {createContext} from "react";

/**
 * True while a guided lesson owns the scene. Preset operations that would replace the scene (select, reset, delete,
 * import) are disabled then, so the lesson never describes a scene that was replaced underneath it.
 */
export const PresetLockContext = createContext(false);
