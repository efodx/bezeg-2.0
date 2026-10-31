import type {DemonstrationId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';

/**
 * Poster URL for content that needs a plain string. The generated map is Partial so a new Demonstration does not block
 * typecheck before capture runs; a missing poster yields an empty URL here and fails `demonstrationPreviewAssets.test.ts`.
 */
export const previewPoster = (id: DemonstrationId): string => demonstrationPreviewAssets[id] ?? '';
