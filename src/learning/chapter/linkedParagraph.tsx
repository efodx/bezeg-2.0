import React from 'react';
import {Link} from 'react-router-dom';

/** One paragraph of one language with its in-text links; a link whose label is not in the text is dropped. */
export function linkedParagraph(text: string, links?: readonly {label: string; href: string}[]): React.ReactNode {
    if (!links?.length) return text;
    const result: React.ReactNode[] = [];
    let cursor = 0;
    const matches = links.map(link => ({...link, at: text.indexOf(link.label)})).filter(link => link.at >= 0).sort((a, b) => a.at - b.at);
    for (const match of matches) {
        if (match.at < cursor) continue;
        if (match.at > cursor) result.push(text.slice(cursor, match.at));
        result.push(<Link key={`${match.href}-${match.at}`} to={match.href}>{match.label}</Link>);
        cursor = match.at + match.label.length;
    }
    const remainder = text.slice(cursor);
    if (remainder) result.push(remainder);
    return result;
}
