import {getDemonstrationCatalog} from '../../demonstrations';
import {patchGuidedExamplesBasics} from './patchGuidedExamplesBasics';
import {patchGuidedExamplesEvaluation} from './patchGuidedExamplesEvaluation';
import {patchGuidedExamplesAdvanced} from './patchGuidedExamplesAdvanced';

/** Section-owned patch examples. This stays separate from retained media homes until capture assets exist. */
export const patchGuidedExampleRegistry = {...patchGuidedExamplesBasics, ...patchGuidedExamplesEvaluation, ...patchGuidedExamplesAdvanced};

export function patchGuidedExamplePath(sectionId: keyof typeof patchGuidedExampleRegistry): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === patchGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.bezier-patches.${sectionId}.${demo.id}`;
}
