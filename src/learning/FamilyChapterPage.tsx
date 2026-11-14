import React, {useEffect, useMemo, useRef} from 'react';
import {Link, useLocation, useParams} from 'react-router-dom';
import {ErrorPage} from '../ErrorPage';
import {getDemonstrationCatalog} from '../demonstrations';
import {useLanguage} from '../localization';
import {typesetMath} from '../mathjax/loadMathJax';
import {familyChapters} from './content/familyChapters';
import type {FamilyChapter} from './content/familyChapters';
import type {LocalizedText} from './model';
import {type OrderedChapterContent, type PlaygroundContent} from './chapter/orderedContent';
import {ChapterContents, ChapterNeighbors, ChapterTrail} from './ChapterNavigation';
import {ChapterSectionHeading} from './ChapterSectionHeading';
import {ChapterGuidedLessons} from './ChapterGuidedLessons';
import {restoreGuidedExampleReading} from './chapter/guidedExampleReading';
import {linkedParagraph} from './chapter/linkedParagraph';
import {observeChapterInlineMath} from './chapter/inlineMathLayout';
import {useChapterDocumentTitle} from './chapter/useChapterDocumentTitle';
import './ChapterPage.css';
import './LearningPage.css';

const CollisionPlayground = React.lazy(() => import('./playground/collisions/CollisionPlayground'));
const CollisionInspect = React.lazy(() => import('./playground/collisions/CollisionInspect'));

/** Playground blocks mount lazily, so a worker or board exists only while the reader has the block on the page. */
function PlaygroundBlock({block}: {block: PlaygroundContent}) {
    return <React.Suspense fallback={<div className="chapter-playground-loading" aria-hidden="true"/>}>
        {block.playground === 'collisions' ? (block.mode === 'run' ? <CollisionPlayground/> : block.mode === 'polygons' ? <CollisionPlayground shape="polygon"/> : <CollisionInspect/>) : null}
    </React.Suspense>;
}

function sectionContent(section: FamilyChapter['sections'][number]): readonly (OrderedChapterContent<LocalizedText> | PlaygroundContent)[] {
    if (section.orderedContent) return section.orderedContent;
    return [
        ...section.paragraphs.map(text => ({kind: 'paragraph' as const, text})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
    ];
}

function ChapterReading({chapter}: {chapter: FamilyChapter}) {
    const {language} = useLanguage();
    const location = useLocation();
    const articleRef = useRef<HTMLElement>(null);
    const restoredPath = useRef<string>();
    const catalog = getDemonstrationCatalog();
    const family = catalog.families.find(entry => entry.id === chapter.family)!;
    useChapterDocumentTitle(chapter.title[language]);
    const contentsSections = useMemo(() => chapter.sections.map(section => ({id: section.id, title: section.title[language]})), [chapter, language]);

    useEffect(() => {
        const article = articleRef.current;
        if (!article) return;
        let disposed = false;
        let frame = 0;
        const settle = () => {
            if (disposed) return;
            const returnPath = `${location.pathname}${location.hash}`;
            if (restoredPath.current !== returnPath) {
                restoredPath.current = returnPath;
                if (restoreGuidedExampleReading(returnPath)) return;
            }
            const id = location.hash.slice(1);
            if (id && chapter.sections.some(section => section.id === id)) {
                document.getElementById(id)?.scrollIntoView();
                document.getElementById(`${id}-heading`)?.focus({preventScroll: true});
            }
        };
        // Browser history may restore focus after the math promise settles.
        const schedule = () => { if (!disposed) frame = window.requestAnimationFrame(settle); };
        let stopMathLayout: (() => void) | undefined;
        void typesetMath(article, () => !disposed).then(() => {
            if (disposed) return;
            stopMathLayout = observeChapterInlineMath(article, language);
            schedule();
        }, schedule);
        return () => { disposed = true; stopMathLayout?.(); window.cancelAnimationFrame(frame); };
    }, [chapter, language, location.hash, location.pathname]);

    useEffect(() => {
        if (!location.hash) {
            window.scrollTo(0, 0);
            document.getElementById('chapter-title')?.focus({preventScroll: true});
        }
    // A new chapter starts at its heading; language switches preserve the reading position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapter.id]);

    return <main className="chapter-page">
        <div className="chapter-layout" data-content-column>
            <ChapterContents sections={contentsSections} chapterId={chapter.id}/>
            <article className="chapter-article" ref={articleRef}>
                <header className="chapter-heading">
                    <ChapterTrail chapterId={chapter.id}/>
                    <h1 id="chapter-title" tabIndex={-1}>{chapter.title[language]}</h1>
                    <p className="chapter-purpose">{chapter.purpose[language]}</p>
                    <div className="chapter-prerequisites"><strong>{language === 'sl' ? 'Predznanje' : 'Prerequisites'}</strong><p>{chapter.prerequisites[language]}</p>
                        {chapter.prerequisiteLinks?.length ? <ul className="chapter-prerequisite-links">{chapter.prerequisiteLinks.map(link => <li key={link.path}><Link to={link.path}>{link.title[language]}</Link></li>)}</ul> : null}
                    </div>
                </header>
                {chapter.sections.map((section, index) => <section className="chapter-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <ChapterSectionHeading id={section.id} title={section.title[language]} index={index} language={language}/>
                    <div className="chapter-section-body">
                        {sectionContent(section).map((block, blockIndex) => {
                            if (block.kind === 'playground') return <PlaygroundBlock key={`${section.id}-playground-${blockIndex}`} block={block}/>;
                            if (block.kind === 'example') return <ChapterGuidedLessons key={`${section.id}-example-${block.exampleId}`} chapterId={chapter.id} sectionId={section.id} language={language} exampleId={block.exampleId}/>;
                            if (block.kind === 'paragraph') return <p className="chapter-paragraph" key={`${section.id}-paragraph-${blockIndex}`}>{linkedParagraph(block.text[language], block.links?.map(link => ({label: link.label[language], href: link.href})))}</p>;
                            return <div className="chapter-formula" role="region" aria-label={block.label?.[language] ?? section.title[language]} tabIndex={0} key={`${section.id}-formula-${blockIndex}`}>{block.label && <span className="chapter-formula-label">{block.label[language]}</span>}<div className="chapter-math">\[{block.latex}\]</div></div>;
                        })}
                    </div>
                </section>)}
                <footer className="chapter-source">
                    <p>{language === 'sl' ? `To je prvi osnutek poglavja za področje ${family.title}. Ob razlagi odpri vodeni primer; slika ponazarja trditev, splošne veljavnosti pa sama ne dokazuje.` : `This is a first draft for ${family.title}. Open a guided example alongside the text; a picture illustrates a claim but does not by itself prove it in general.`}</p>
                    <ChapterNeighbors chapterId={chapter.id}/>
                </footer>
            </article>
        </div>
    </main>;
}

export function FamilyChapterPage() {
    const {chapterId} = useParams();
    const chapter = familyChapters.find(entry => entry.id === chapterId);
    return chapter ? <ChapterReading key={chapter.id} chapter={chapter}/> : <ErrorPage embedded/>;
}
