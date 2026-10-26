import {captureReading, restoreReading} from './navigationMemory';
import type {ReadingLocation} from './navigationMemory';

// Reading bookmarks are visit-local. Graph checkpoints stay with LessonSession.
const bookmarks = new Map<string, ReadingLocation>();

export function rememberGuidedExampleReading(returnPath: string, focusId: string): void {
    const sectionId = returnPath.split('#')[1];
    if (!sectionId) return;
    bookmarks.set(returnPath, captureReading(sectionId, focusId));
    window.history.replaceState(window.history.state, '', returnPath);
}

export function restoreGuidedExampleReading(returnPath: string): boolean {
    const location = bookmarks.get(returnPath);
    if (!location) return false;
    restoreReading(location, location.sectionId);
    return true;
}
