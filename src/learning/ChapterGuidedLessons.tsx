import React from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from '../demonstrations';
import type {Language} from '../localization';
import {authoredGuidedLessonIds, getGuidedLessonOwnerForSection, guidedLessonLaunchPath} from './chapter/guidedLessonOwnership';
import './ChapterGuidedLessons.css';

export function ChapterGuidedLessons({chapterId, sectionId, language}: {chapterId: string; sectionId: string; language: Language}) {
    const ids = authoredGuidedLessonIds(chapterId, sectionId);
    if (!ids.length) return null;
    const catalog = getDemonstrationCatalog();
    return <nav className="chapter-guided-lessons" aria-label={language === 'sl' ? 'Vodene učne poti v tem razdelku' : 'Guided lessons in this section'}>
        <p>{language === 'sl' ? 'Učna pot ob grafu' : 'Guided lesson alongside the graph'}</p>
        <ul>{ids.map(id => {
            const demo = catalog.demonstrations.find(entry => entry.id === id)!;
            const owner = getGuidedLessonOwnerForSection(id, chapterId, sectionId)!;
            return <li key={id}><Link to={guidedLessonLaunchPath(id, owner)}>{demo.catalogTitle}<span aria-hidden="true"> →</span></Link></li>;
        })}</ul>
    </nav>;
}
