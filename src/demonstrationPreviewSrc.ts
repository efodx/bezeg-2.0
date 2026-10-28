import type {DemonstrationId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';

/**
 * Catalog still for a demonstration, or `undefined` when none has been captured yet (patch-triangular until the
 * preview-capture work, task 13); `DemonstrationPreview` then shows only its pale frame. Remove this helper once the
 * generated map is complete again.
 */
export const demonstrationPreviewSrc = (id: DemonstrationId): string | undefined =>
    id === 'patch-triangular' ? undefined : demonstrationPreviewAssets[id];
