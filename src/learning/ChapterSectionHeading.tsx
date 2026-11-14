import React from 'react';
import {ChapterSectionPermalink} from './ChapterNavigation';

/** The heading row of a chapter section: two-digit number, h2 and permalink. Shared so chapter pages cannot diverge. */
export function ChapterSectionHeading({id, title, index, language}: {id: string; title: string; index: number; language: 'sl' | 'en'}) {
    return <div className="chapter-section-heading">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <h2 id={`${id}-heading`} tabIndex={-1}>{title}</h2>
        <ChapterSectionPermalink id={id} title={title} language={language}/>
    </div>;
}
