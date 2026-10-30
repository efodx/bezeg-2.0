import React, {useEffect, useRef} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {getDemonstrationCatalog} from '../demonstrations';
import {useLanguage} from '../localization';
import {chapterActivityVisit} from './chapter/ChapterActivityVisit';
import {restoreGuidedExampleReading} from './chapter/guidedExampleReading';
import {ChapterGuidedLessons} from './ChapterGuidedLessons';
import {bezierChapter} from './content/bezierChapter';
import {findActivity} from './chapter/activities';
import {type OrderedChapterContent, type OrderedChapterFigure} from './chapter/orderedContent';
import {typesetMath} from '../mathjax/loadMathJax';
import {ChapterContents, ChapterNeighbors, ChapterTrail} from './ChapterNavigation';
import './ChapterPage.css';
import './LearningPage.css';

type SectionScrollAnchor = {sectionId: string; top: number};
function restoreSectionAnchor(anchor: SectionScrollAnchor) {
    const section = document.getElementById(anchor.sectionId);
    if (section) window.scrollTo(0, Math.max(0, window.scrollY + section.getBoundingClientRect().top - anchor.top));
}

function renderParagraph(text: string, links?: readonly {label: string; href: string}[]) {
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

function ChapterContentView({block, chapterId, sectionId, language}: {
    block: OrderedChapterContent<string, OrderedChapterFigure>;
    chapterId: string;
    sectionId: string;
    language: 'sl' | 'en';
}) {
    if (block.kind === 'example') return <ChapterGuidedLessons chapterId={chapterId} sectionId={sectionId} language={language} exampleId={block.exampleId}/>;
    if (block.kind === 'figure') return <figure className="chapter-activity-figure">
        <img src={block.figure.src} alt={block.figure.alt[language]} width="720" height="440" loading="lazy"/>
        <figcaption>{block.figure.caption[language]}</figcaption>
    </figure>;
    if (block.kind === 'formula') return <div className="chapter-formula" role="region" aria-label={block.label ?? ''} tabIndex={0}>{block.label && <span className="chapter-formula-label">{block.label}</span>}<div className="chapter-math">\[{block.latex}\]</div></div>;
    return <p className="chapter-paragraph">{renderParagraph(block.text, block.links)}</p>;
}

export function ChapterPage() {
    const {language} = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const copy = bezierChapter[language];
    const articleRef = useRef<HTMLElement>(null);
    const previousLanguage = useRef(language);
    const scrollAnchor = useRef<SectionScrollAnchor>({sectionId: 'motivation', top: 0});

    useEffect(() => {
        const restored = restoreGuidedExampleReading(`${location.pathname}${location.hash}`) || chapterActivityVisit.restoreReading('motivation');
        const hash = location.hash.slice(1);
        const invocation = location.state && typeof location.state === 'object' ? location.state.chapterReadingInvocation : undefined;
        const sourceActivity = invocation && typeof invocation === 'object' && invocation.v === 1
            && typeof invocation.activityId === 'string' && invocation.readingKey === location.key
            && copy.sections.some(section => section.id === invocation.sectionId) ? findActivity(invocation.activityId) : undefined;
        if (!restored && sourceActivity) {
            requestAnimationFrame(() => {
                document.getElementById(invocation.sectionId)?.scrollIntoView();
                (document.getElementById(`activity-${sourceActivity.id}`)
                    ?? document.getElementById(`${invocation.sectionId}-heading`))?.focus({preventScroll: true});
            });
        } else if (!restored && hash && copy.sections.some(section => section.id === hash)) {
            requestAnimationFrame(() => {
                document.getElementById(hash)?.scrollIntoView();
                document.getElementById(`${hash}-heading`)?.focus({preventScroll: true});
            });
        } else if (!restored && hash) {
            navigate(`${location.pathname}${location.search}`, {replace: true, state: location.state});
            requestAnimationFrame(() => document.getElementById('chapter-title')?.focus());
        }
    // Hash navigation remains directly addressable; language changes retain the stable section identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.hash]);

    useEffect(() => {
        let frame = 0;
        const captureAnchor = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const candidates = copy.sections.map(section => document.getElementById(section.id)).filter((item): item is HTMLElement => Boolean(item));
                const eligible = candidates.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .35);
                const visible = eligible[eligible.length - 1] ?? candidates[0];
                if (visible) scrollAnchor.current = {sectionId: visible.id, top: visible.getBoundingClientRect().top};
            });
        };
        window.addEventListener('scroll', captureAnchor, {passive: true});
        captureAnchor();
        return () => { window.removeEventListener('scroll', captureAnchor); if (frame) window.cancelAnimationFrame(frame); };
    }, [copy]);

    useEffect(() => {
        const article = articleRef.current;
        if (!article) return;
        const languageChanged = previousLanguage.current !== language;
        const savedAnchor = scrollAnchor.current;
        previousLanguage.current = language;
        let disposed = false;
        const restoreAnchor = () => {
            if (!disposed && languageChanged) requestAnimationFrame(() => {
                if (!disposed) restoreSectionAnchor(savedAnchor);
            });
        };
        const settle = () => {
            if (disposed) return;
            if (!languageChanged && restoreGuidedExampleReading(`${location.pathname}${location.hash}`)) return;
            restoreAnchor();
        };
        void typesetMath(article, () => !disposed).then(settle, settle);
        return () => { disposed = true; };
    }, [language, location.hash, location.pathname]);

    const state = location.state && typeof location.state === 'object' ? location.state as Record<string, unknown> : {};
    const requestedGraphId = state.chapterGraphId;
    const supportedGraphIds = ['bezier', 'decasteljau', 'bernstein', 'affine'];
    const relatedDemo = typeof requestedGraphId === 'string' && supportedGraphIds.includes(requestedGraphId)
        ? getDemonstrationCatalog().demonstrations.find(demo => demo.id === requestedGraphId)
        : undefined;
    const graphReturnPath = chapterActivityVisit.ordinaryReturnPath() ?? relatedDemo?.path;
    const graphReturnIsMemory = Boolean(chapterActivityVisit.ordinaryReturnPath());

    return <main className="chapter-page">
        <div className="chapter-layout">
            <ChapterContents sections={copy.sections} chapterId="bezier-curves" showNumbers/>
            <article className="chapter-article" ref={articleRef}>
                <header className="chapter-heading">
                    <ChapterTrail chapterId="bezier-curves"/>
                    {graphReturnPath && <div className="chapter-graph-return">
                        <Link to={graphReturnPath} state={{...state, chapterRestore: true}}><span aria-hidden="true">←</span>{language === 'sl' ? 'Nazaj na graf' : 'Back to your graph'}</Link>
                        {!graphReturnIsMemory && <p role="note">{language === 'sl' ? 'Po ponovnem nalaganju prejšnjega stanja grafa ni bilo mogoče obnoviti; prikaz se bo odprl z začetnimi nastavitvami.' : 'The earlier graph state could not be restored after reload; the demonstration will open with its default settings.'}</p>}
                    </div>}
                    <h1 id="chapter-title" tabIndex={-1}>{copy.title}</h1>
                    <p className="chapter-purpose">{copy.purpose}</p>
                    <div className="chapter-prerequisites"><strong>{language === 'sl' ? 'Predznanje' : 'Prerequisites'}</strong><p>{copy.prerequisites}</p></div>
                </header>
                {copy.sections.map((section, index) => <section className="chapter-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <div className="chapter-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2 id={`${section.id}-heading`} tabIndex={-1}>{section.title}</h2><a className="chapter-section-link" href={`#${section.id}`} aria-label={`${language === 'sl' ? 'Povezava do razdelka' : 'Link to section'}: ${section.title}`}>¶</a></div>
                    <div className="chapter-section-body">{(section.orderedContent ?? []).map((block, blockIndex) => <ChapterContentView block={block} chapterId="bezier-curves" sectionId={section.id} language={language} key={`${section.id}-${block.kind}-${block.kind === 'example' ? block.exampleId : blockIndex}`}/>)}</div>
                    {index < copy.sections.length - 1 && <div className="chapter-next-row"><a href={`#${copy.sections[index + 1].id}`}>{language === 'sl' ? 'Naprej' : 'Next'}: {copy.sections[index + 1].title}<span aria-hidden="true"> ↓</span></a></div>}
                </section>)}
                <footer className="chapter-source"><h2>{language === 'sl' ? 'Vir' : 'Source'}</h2><p>{copy.source}</p>
                    <ChapterNeighbors chapterId="bezier-curves"/>
                </footer>
            </article>
        </div>
    </main>;
}

export default ChapterPage;
