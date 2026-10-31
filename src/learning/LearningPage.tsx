import React, {useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useLanguage} from '../localization';
import {demonstrationPreviewAssets} from '../demonstrationPreviewAssets';
import type {DemonstrationId} from '../demonstrations';
import {learningChapters} from './learningChapters';
import {bezierChapter} from './content/bezierChapter';
import {getChapterGuidedExamples} from './chapter/guidedExamples';
import type {LessonLanguage, LocalizedText} from './model';
import {useTypesetMath} from './useTypesetMath';
import './LearningPage.css';

const topicPreviews: Record<string, {demonstration: DemonstrationId; alt: LocalizedText}> = {
    foundations: {demonstration: 'bernstein', alt: {sl: 'Grafi Bernsteinovih baznih polinomov na intervalu od 0 do 1.', en: 'Graphs of the Bernstein basis polynomials on the interval from 0 to 1.'}},
    'bezier-curves': {demonstration: 'bezier', alt: {sl: 'Bézierjeva krivulja in črtkana povezava njenih kontrolnih točk.', en: 'A Bézier curve with the dashed polygon connecting its control points.'}},
    'rational-curves': {demonstration: 'rational', alt: {sl: 'Racionalna Bézierjeva krivulja s kontrolnim poligonom in prikazanimi utežmi.', en: 'A rational Bézier curve with its control polygon and displayed weights.'}},
    splines: {demonstration: 'spline-cn', alt: {sl: 'Zlepek dveh krivuljnih odsekov s kontrolnimi točkami na obeh straneh spoja.', en: 'A spline joining two curve segments, with control points on both sides of the join.'}},
    'ph-curves': {demonstration: 'ph-cubic', alt: {sl: 'Kubična PH-krivulja z dvema prikazanima krivuljama in dolžino loka.', en: 'A cubic PH curve with two displayed curves and an arc-length value.'}},
    parametrization: {demonstration: 'uniform-parameterization', alt: {sl: 'Vzorčne točke na krivulji so označene z razmiki, ki se po loku razlikujejo.', en: 'Sample points are marked along a curve with visibly varying distances along the arc.'}},
    'bezier-patches': {demonstration: 'patch-tensor', alt: {sl: 'Tenzorska Bézierjeva krpa s kontrolno mrežo v tridimenzionalnem pogledu.', en: 'A tensor-product Bézier patch with its control net in a three-dimensional view.'}},
    'functions-and-calculus': {demonstration: 'derivative', alt: {sl: 'Graf kvadratne funkcije z označeno tangentno premico pri izbrani točki.', en: 'A quadratic function graph with a tangent line marked at a selected point.'}},
    analysis: {demonstration: 'bisection', alt: {sl: 'Graf kvadratne funkcije z intervalom in razpoloviščem pri bisekcijski metodi.', en: 'A quadratic graph with an interval and midpoint for the bisection method.'}},
};

// Strands group the suggested order; together they list every chapter exactly once.
export const learningStrands: readonly {id: string; title: LocalizedText; chapters: readonly string[]}[] = [
    {id: 'curves', title: {sl: 'Krivulje', en: 'Curves'}, chapters: ['foundations', 'bezier-curves', 'rational-curves', 'splines', 'ph-curves', 'parametrization']},
    {id: 'surfaces', title: {sl: 'Ploskve', en: 'Surfaces'}, chapters: ['bezier-patches']},
    {id: 'functions', title: {sl: 'Funkcije in analiza', en: 'Functions and analysis'}, chapters: ['functions-and-calculus', 'analysis']},
];

function chapterOutline(chapterId: string, language: LessonLanguage) {
    const chapter = learningChapters.find(entry => entry.id === chapterId)!;
    const sections = chapterId === 'bezier-curves'
        ? bezierChapter[language].sections.map(section => ({id: section.id, title: section.title}))
        : chapter.sections.map(section => ({id: section.id, title: section.title[language]}));
    return sections.map(section => ({...section, examples: getChapterGuidedExamples(chapterId, section.id).length}));
}

// Slovenian nouns take singular, dual, small plural (3–4) and genitive plural forms.
function countLabel(count: number, language: LessonLanguage, sl: readonly [string, string, string, string], en: readonly [string, string]) {
    if (language === 'en') return `${count} ${count === 1 ? en[0] : en[1]}`;
    const rest = count % 100;
    return `${count} ${rest === 1 ? sl[0] : rest === 2 ? sl[1] : rest === 3 || rest === 4 ? sl[2] : sl[3]}`;
}
const sectionCount = (count: number, language: LessonLanguage) => countLabel(count, language, ['razdelek', 'razdelka', 'razdelki', 'razdelkov'], ['section', 'sections']);
const exampleCount = (count: number, language: LessonLanguage) => countLabel(count, language, ['vodeni primer', 'vodena primera', 'vodeni primeri', 'vodenih primerov'], ['guided example', 'guided examples']);

export function LearningPage() {
    const {language} = useLanguage();
    const location = useLocation();
    const mainRef = useRef<HTMLElement>(null);
    useTypesetMath(mainRef, language);
    useEffect(() => {
        const topic = document.getElementById(location.hash.slice(1));
        if (topic && learningChapters.some(chapter => `#${chapter.id}` === location.hash)) topic.scrollIntoView();
        else window.scrollTo(0, 0);
    }, [location.hash]);

    return <main className="learning-page" ref={mainRef}>
        <div className="learning-page-inner">
            <header className="learning-heading">
                <h1>{language === 'sl' ? 'Uči se z branjem in raziskovanjem' : 'Learn through reading and exploration'}</h1>
                <p>{language === 'sl'
                    ? 'Preberi razdelek poglavja, odpri vodeni primer ob grafu in se vrni k branju.'
                    : 'Read a chapter section, open its guided example on the graph, then return to continue reading.'}</p>
                <p>{language === 'sl'
                    ? 'Teme si sledijo v predlaganem vrstnem redu, vsako poglavje pa lahko odpreš tudi samostojno.'
                    : 'Topics follow a suggested order, but you can open any chapter on its own.'}</p>
                <Link className="learning-open learning-start" to="/bezeg-2.0/learn/foundations">
                    {language === 'sl' ? 'Začni pri osnovah' : 'Start with Foundations'}<span aria-hidden="true"> →</span>
                </Link>
            </header>
            {learningStrands.map(strand => <section className="learning-strand" key={strand.id} aria-labelledby={`strand-${strand.id}`}>
                <h2 id={`strand-${strand.id}`}>{strand.title[language]}</h2>
                <ol className="learning-path" start={learningChapters.findIndex(chapter => chapter.id === strand.chapters[0]) + 1}>
                    {strand.chapters.map(chapterId => {
                        const chapter = learningChapters.find(entry => entry.id === chapterId)!;
                        const preview = topicPreviews[chapter.id];
                        const outline = chapterOutline(chapter.id, language);
                        const examples = outline.reduce((total, section) => total + section.examples, 0);
                        const path = `/bezeg-2.0/learn/${chapter.id}`;
                        return <li className="learning-family" id={chapter.id} key={chapter.id}>
                            <Link className="learning-thumb" to={path} tabIndex={-1}>
                                <img src={demonstrationPreviewAssets[preview.demonstration]} alt={preview.alt[language]} width="720" height="440" loading="lazy"/>
                            </Link>
                            <h3 className="learning-topic-heading" id={`${chapter.id}-heading`}><Link to={path}>{chapter.title[language]}</Link></h3>
                            <p className="learning-topic-body">{chapter.purpose[language]}</p>
                            <Link className="learning-read" to={path}>{language === 'sl' ? 'Preberi poglavje' : 'Read the chapter'}<span aria-hidden="true"> →</span></Link>
                            <details className="learning-outline">
                                <summary>{language === 'sl' ? 'Vsebina' : 'Contents'}<span className="learning-outline-meta">{sectionCount(outline.length, language)} · {exampleCount(examples, language)}</span></summary>
                                <ol>{outline.map(section => <li key={section.id}>
                                    <Link to={`${path}#${section.id}`}>{section.title}</Link>
                                    {section.examples > 0 && <span className="learning-outline-examples">{exampleCount(section.examples, language)}</span>}
                                </li>)}</ol>
                            </details>
                        </li>;
                    })}
                </ol>
            </section>)}
        </div>
    </main>;
}

export default LearningPage;
