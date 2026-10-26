import React from 'react';
import {Link} from 'react-router-dom';
import type {Language} from '../localization';
import {getChapterGuidedExamples} from './chapter/guidedExamples';
import {rememberGuidedExampleReading} from './chapter/guidedExampleReading';
import {ChapterExploration} from './ChapterExploration';
import type {ChapterExplorationPreview} from './ChapterExploration';
import {resolveGuidedExamplePreview} from './chapter/guidedExamplePreviews';
import './ChapterGuidedLessons.css';

export type ChapterGuidedLessonsProps = {
    chapterId: string;
    sectionId: string;
    language: Language;
    /** Render the card referenced at this point in the authored sequence. */
    exampleId: string;
    /** Inject exact-scene preview metadata without coupling the renderer to its source. */
    previewFor?: (exampleId: string, language: Language) => ChapterExplorationPreview | undefined;
};

export function ChapterGuidedLessons({chapterId, sectionId, language, exampleId, previewFor}: ChapterGuidedLessonsProps) {
    const available = getChapterGuidedExamples(chapterId, sectionId);
    const examples = available.filter(example => example.id === exampleId);
    if (!examples.length) return null;
    const label = language === 'sl' ? 'Vodeni primer' : 'Guided example';
    const returnPath = `/bezeg-2.0/learn/${chapterId}#${sectionId}`;
    return <div className="chapter-guided-lessons learning-investigations">
        <div className="learning-investigation-list">{examples.map(example => {
            const linkId = `example-${chapterId}-${sectionId}-${example.id}`;
            return <ChapterExploration key={example.id} kind="guided-example" label={label}
                title={example.title[language]} prompt={example.prompt?.[language]}
                promptClassName="learning-investigation-prompt"
                preview={previewFor?.(example.id, language) ?? resolveGuidedExamplePreview(example.id, example.demonstrationId, language)}
                action={<Link id={linkId} className="chapter-open-activity" to={example.path} onClick={event => {
                    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    rememberGuidedExampleReading(returnPath, linkId);
                }}>{label}<span aria-hidden="true"> →</span></Link>}/>;
        })}</div>
    </div>;
}
