import {useEffect} from 'react';

/** Names the open chapter in the document title and restores the previous title when the reader leaves. */
export function useChapterDocumentTitle(chapterTitle: string) {
    useEffect(() => {
        const previous = document.title;
        document.title = `${chapterTitle} · Bezeg`;
        return () => { document.title = previous; };
    }, [chapterTitle]);
}
