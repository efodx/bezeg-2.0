import React from 'react';

export type ChapterExplorationPreview = {
    src: string;
    alt: string;
    caption: string;
};

export function ChapterExploration({
    kind,
    label,
    title,
    prompt,
    promptClassName,
    preview,
    action,
    context,
    secondary,
}: {
    kind: 'prepared-activity' | 'free-exploration' | 'guided-example';
    label: string;
    title: string;
    prompt?: string;
    promptClassName?: string;
    preview?: ChapterExplorationPreview;
    action: React.ReactNode;
    context?: React.ReactNode;
    secondary?: React.ReactNode;
}) {
    return <aside className={`chapter-exploration chapter-exploration--${kind}${preview ? '' : ' chapter-exploration--without-preview'}`} aria-label={`${label}: ${title}`}>
        {preview && <figure className="chapter-activity-figure">
            <img src={preview.src} alt={preview.alt} width="720" height="440" loading="lazy" decoding="async"/>
            <figcaption>{preview.caption}</figcaption>
        </figure>}
        <div className="chapter-exploration-copy">
            <h3>{title}</h3>
            {prompt && <p className={`chapter-exploration-prompt${promptClassName ? ` ${promptClassName}` : ''}`}>{prompt}</p>}
            {context && <div className="chapter-exploration-context">{context}</div>}
            {action}
            {secondary && <div className="chapter-exploration-secondary">{secondary}</div>}
        </div>
    </aside>;
}
