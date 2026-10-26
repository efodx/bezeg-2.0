import React from 'react';
import {Link} from 'react-router-dom';
import type {Language} from '../localization';
import {getChapterGuidedExamples} from './chapter/guidedExamples';
import {rememberGuidedExampleReading} from './chapter/guidedExampleReading';
import {ChapterExploration} from './ChapterExploration';
import {activityFigures} from './chapterActivityFigures';
import './ChapterGuidedLessons.css';

export function ChapterGuidedLessons({chapterId, sectionId, language}: {chapterId: string; sectionId: string; language: Language}) {
    const examples = getChapterGuidedExamples(chapterId, sectionId);
    if (!examples.length) return null;
    const label = language === 'sl' ? 'Vodeni primer' : 'Guided example';
    const returnPath = `/bezeg-2.0/learn/${chapterId}#${sectionId}`;
    return <div className="chapter-guided-lessons learning-investigations">
        <div className="learning-investigation-list">{examples.map(example => {
            const figure = Object.entries(activityFigures).find(([id]) => example.id === id)?.[1];
            const linkId = `example-${chapterId}-${sectionId}-${example.id}`;
            return <ChapterExploration key={example.id} kind="guided-example" label={label}
                title={example.title[language]} prompt={example.prompt?.[language]}
                promptClassName="learning-investigation-prompt"
                preview={figure ? {src: figure.src, alt: figure.alt[language], caption: figure.caption[language]} : undefined}
                action={<Link id={linkId} className="chapter-open-activity" to={example.path} onClick={event => {
                    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    rememberGuidedExampleReading(returnPath, linkId);
                }}>{label}<span aria-hidden="true"> →</span></Link>}/>;
        })}</div>
    </div>;
}
