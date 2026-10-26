import React, {useEffect, useRef} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {getDemonstrationCatalog} from '../demonstrations';
import {useLanguage} from '../localization';
import type {Language} from '../localization';
import {chapterActivityVisit} from './chapter/ChapterActivityVisit';
import {ChapterGuidedLessons} from './ChapterGuidedLessons';
import {bezierActivityCopy, bezierChapter} from './content/bezierChapter';
import type {BezierActivityId, ChapterBlock, ChapterSection} from './content/bezierChapter';
import {findActivity} from './chapter/activities';
import {typesetMath} from '../mathjax/loadMathJax';
import {ChapterContents, ChapterNeighbors} from './ChapterNavigation';
import shapeControlFigure from '../images/learning/bezier/shape-control.png';
import curveParameterFigure from '../images/learning/bezier/curve-parameter.png';
import repeatedInterpolationFigure from '../images/learning/bezier/repeated-interpolation.png';
import blendingCoefficientsFigure from '../images/learning/bezier/blending-coefficients.png';
import geometricBoundsFigure from '../images/learning/bezier/geometric-bounds.png';
import transformShapeFigure from '../images/learning/bezier/transform-shape.png';
import './ChapterPage.css';
import './LearningPage.css';

type SectionScrollAnchor = {sectionId: string; top: number};
function restoreSectionAnchor(anchor: SectionScrollAnchor) {
    const section = document.getElementById(anchor.sectionId);
    if (section) window.scrollTo(0, Math.max(0, window.scrollY + section.getBoundingClientRect().top - anchor.top));
}

const activityFigures: Record<BezierActivityId, {src: string; alt: Record<Language, string>; caption: Record<Language, string>}> = {
    'shape-control': {src: shapeControlFigure,
        alt: {sl: 'Kubična Bézierjeva krivulja, štiri kontrolne točke in črtkani kontrolni poligon.', en: 'A cubic Bézier curve, its four control points, and the dashed control polygon.'},
        caption: {sl: 'Pripravljena kubična krivulja s kontrolnim poligonom in kontrolnimi točkami.', en: 'The prepared cubic curve with its control polygon and control points.'}},
    'curve-parameter': {src: curveParameterFigure,
        alt: {sl: 'Krivulja stopnje štiri in zaporedne točke De Casteljaujeve konstrukcije.', en: 'A degree-four curve with successive points from the De Casteljau construction.'},
        caption: {sl: 'Pri parametru \\(t = 0{,}5\\) končna interpolirana točka leži na krivulji stopnje štiri.', en: 'At \\(t = 0.5\\), the final interpolated point lies on the degree-four curve.'}},
    'repeated-interpolation': {src: repeatedInterpolationFigure,
        alt: {sl: 'Pet kontrolnih točk in vse zaporedne vrstice interpolacije do točke na krivulji.', en: 'Five control points and each successive interpolation row ending at the curve point.'},
        caption: {sl: 'Pri \\(t = 0{,}5\\) pet kontrolnih točk da štiri, tri, dve in nazadnje eno interpolirano točko.', en: 'At \\(t = 0.5\\), five controls produce rows of four, three, two, then one interpolated point.'}},
    'blending-coefficients': {src: blendingCoefficientsFigure,
        alt: {sl: 'Trije grafi Bernsteinovih baznih funkcij stopnje dve na intervalu od nič do ena.', en: 'Three graphs of the degree-two Bernstein basis functions on the interval from zero to one.'},
        caption: {sl: 'Tri Bernsteinove bazne funkcije druge stopnje na intervalu od nič do ena.', en: 'The three degree-two Bernstein basis functions on the interval from zero to one.'}},
    'geometric-bounds': {src: geometricBoundsFigure,
        alt: {sl: 'Kubična Bézierjeva krivulja v osenčeni konveksni ovojnici svojih kontrolnih točk.', en: 'A cubic Bézier curve inside the shaded convex hull of its control points.'},
        caption: {sl: 'Krivulja leži v konveksni ovojnici kontrolnih točk; prikazan je en konkreten primer.', en: 'The curve lies in the convex hull of its control points; this shows one example.'}},
    'transform-shape': {src: transformShapeFigure,
        alt: {sl: 'Začetna kubična Bézierjeva krivulja s kontrolnimi točkami in kontrolnim poligonom.', en: 'The starting cubic Bézier curve with its control points and control polygon.'},
        caption: {sl: 'Začetni kubični primer za raziskovanje premika, spremembe merila, vrtenja ali zrcaljenja.', en: 'The starting cubic example for exploring translation, scaling, rotation, or reflection.'}},
};
function ActivityFigure({activity, language}: {activity: BezierActivityId; language: Language}) {
    const figure = activityFigures[activity];
    return <figure className="chapter-activity-figure">
        <img src={figure.src} alt={figure.alt[language]} width={720} height={440} loading="lazy" decoding="async"/>
        <figcaption>{figure.caption[language]}</figcaption>
    </figure>;
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

function ActivityCard({id, sectionId, language}: {id: BezierActivityId; sectionId: string; language: Language}) {
    const location = useLocation();
    const copy = bezierActivityCopy[id][language];
    const linkId = `activity-${id}`;
    return <aside className="chapter-activity-card" aria-label={language === 'sl' ? 'Dejavnost za raziskovanje' : 'Graph exploration activity'}>
        <ActivityFigure activity={id} language={language}/>
        <div className="chapter-activity-copy">
            <h3>{copy.title}</h3>
            <p>{copy.prompt}</p>
            <p className="chapter-activity-return"><span>{language === 'sl' ? 'Vrni se k:' : 'Return to:'}</span> <a href={`#${sectionId}`}>{sectionId === 'control-points' ? (language === 'sl' ? 'razlagi kontrolnih točk' : 'the control-point explanation') : bezierChapter[language].sections.find(section => section.id === sectionId)?.title}</a></p>
            <Link id={linkId} className="chapter-open-activity" to={copy.demoHref} state={chapterActivityVisit.activityEntryState(location.state, id, location.key)} onClick={() => chapterActivityVisit.prepareActivityLaunch(id, sectionId, linkId, location.key)}>{language === 'sl' ? 'Odpri raziskovanje' : 'Open exploration'}<span aria-hidden="true"> →</span></Link>
        </div>
    </aside>;
}

function ChapterBlockView({block, section, language}: {block: ChapterBlock; section: ChapterSection; language: Language}) {
    if (block.kind === 'activity') return <ActivityCard key={block.id} id={block.id} sectionId={section.id} language={language}/>;
    if (block.kind === 'formula') return <div className="chapter-formula" role="region" aria-label={block.label} tabIndex={0}><span className="chapter-formula-label">{block.label}</span><div className="chapter-math">\[{block.latex}\]</div></div>;
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
        const restored = chapterActivityVisit.restoreReading('motivation');
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
        void typesetMath(article, () => !disposed).then(restoreAnchor, restoreAnchor);
        return () => { disposed = true; };
    }, [language]);

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
            <ChapterContents sections={copy.sections} showNumbers/>
            <article className="chapter-article" ref={articleRef}>
                <header className="chapter-heading">
                    <Link className="learning-back" to="/bezeg-2.0/learn">{language === 'sl' ? 'Vsa učna vsebina' : 'All learning content'}<span aria-hidden="true"> ←</span></Link>
                    {graphReturnPath && <div className="chapter-graph-return">
                        <Link to={graphReturnPath} state={{...state, chapterRestore: true}}>{language === 'sl' ? 'Nazaj na graf' : 'Back to your graph'}<span aria-hidden="true"> ←</span></Link>
                        {!graphReturnIsMemory && <p role="note">{language === 'sl' ? 'Po ponovnem nalaganju prejšnjega stanja grafa ni bilo mogoče obnoviti; prikaz se bo odprl z začetnimi nastavitvami.' : 'The earlier graph state could not be restored after reload; the demonstration will open with its default settings.'}</p>}
                    </div>}
                    <h1 id="chapter-title" tabIndex={-1}>{copy.title}</h1>
                    <p className="chapter-purpose">{copy.purpose}</p>
                    <div className="chapter-prerequisites"><strong>{language === 'sl' ? 'Predznanje' : 'Prerequisites'}</strong><p>{copy.prerequisites}</p></div>
                </header>
                {copy.sections.map((section, index) => <section className="chapter-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <div className="chapter-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2 id={`${section.id}-heading`} tabIndex={-1}>{section.title}</h2><a className="chapter-section-link" href={`#${section.id}`} aria-label={`${language === 'sl' ? 'Povezava do razdelka' : 'Link to section'}: ${section.title}`}>¶</a></div>
                    <div className="chapter-section-body">{section.blocks.map((block, blockIndex) => <ChapterBlockView block={block} key={`${section.id}-${block.kind}-${blockIndex}`} section={section} language={language}/>)}</div>
                    <ChapterGuidedLessons chapterId="bezier-curves" sectionId={section.id} language={language}/>
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
