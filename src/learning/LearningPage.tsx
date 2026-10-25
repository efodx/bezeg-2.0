import React, {useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useLanguage} from '../localization';
import {getDemonstrationCatalog} from '../demonstrations';
import {demonstrationPreviewAssets} from '../demonstrationPreviewAssets';
import {isGuidedLessonAvailable} from './runtime/lessonAvailability';
import {learningChapters} from './learningChapters';
import {useTypesetMath} from './useTypesetMath';
import './LearningPage.css';

const topicPreviews = {
    foundations: {
        demonstration: 'bernstein',
        alt: {sl: 'Grafi Bernsteinovih baznih polinomov na intervalu od 0 do 1.', en: 'Graphs of the Bernstein basis polynomials on the interval from 0 to 1.'},
        caption: {sl: 'Bernsteinovi polinomi sestavijo uteženo kombinacijo, iz katere nastane Bézierjeva krivulja.', en: 'Bernstein polynomials form the weighted combination that defines a Bézier curve.'},
        connection: 'bezier-curves',
        connectionReason: {sl: 'kjer iz njih sestavimo krivuljo.', en: 'where they are combined to construct the curve.'},
    },
    'bezier-curves': {
        demonstration: 'bezier',
        alt: {sl: 'Bézierjeva krivulja in črtkana povezava njenih kontrolnih točk.', en: 'A Bézier curve with the dashed polygon connecting its control points.'},
        caption: {sl: 'Kontrolni poligon pomaga razložiti, kako točke vplivajo na obliko krivulje.', en: 'The control polygon helps explain how points influence the curve shape.'},
        connection: 'foundations',
        connectionReason: {sl: 'za pogled na bazne polinome, ki jo določajo.', en: 'to see the basis polynomials that define it.'},
    },
    'rational-curves': {
        demonstration: 'rational',
        alt: {sl: 'Racionalna Bézierjeva krivulja s kontrolnim poligonom in prikazanimi utežmi.', en: 'A rational Bézier curve with its control polygon and displayed weights.'},
        caption: {sl: 'Uteži spremenijo vpliv kontrolnih točk na racionalno Bézierjevo krivuljo.', en: 'Weights change how control points influence a rational Bézier curve.'},
        connection: 'bezier-curves',
        connectionReason: {sl: 'ki jih racionalna oblika posploši z utežmi.', en: 'which the rational form extends with weights.'},
    },
    splines: {
        demonstration: 'spline-cn',
        alt: {sl: 'Zlepek dveh krivuljnih odsekov s kontrolnimi točkami na obeh straneh spoja.', en: 'A spline joining two curve segments, with control points on both sides of the join.'},
        caption: {sl: 'Zlepek sestavi več odsekov in določa, kako se stikajo pri skupnem vozlišču.', en: 'A spline combines several segments and specifies how they meet at a shared knot.'},
        connection: 'parametrization',
        connectionReason: {sl: 'saj lokalni parametri vplivajo na pogoje v spoju.', en: 'because local parameters affect conditions at each join.'},
    },
    'ph-curves': {
        demonstration: 'ph-cubic',
        alt: {sl: 'Kubična PH-krivulja z dvema prikazanima krivuljama in dolžino loka.', en: 'A cubic PH curve with two displayed curves and an arc-length value.'},
        caption: {sl: 'Kubična PH-krivulja ima polinomsko določeno dolžino loka.', en: 'A cubic PH curve has a polynomially determined arc length.'},
        connection: 'bezier-curves',
        connectionReason: {sl: 'katerih konstrukcijo uporabimo tudi pri PH-krivuljah.', en: 'whose construction also appears in PH curves.'},
    },
    parametrization: {
        demonstration: 'uniform-parameterization',
        alt: {sl: 'Vzorčne točke na krivulji so označene z razmiki, ki se po loku razlikujejo.', en: 'Sample points are marked along a curve with visibly varying distances along the arc.'},
        caption: {sl: 'Enakomeren korak parametra ne pomeni nujno enake razdalje po krivulji.', en: 'Equal parameter steps do not necessarily mean equal distances along the curve.'},
        connection: 'splines',
        connectionReason: {sl: 'ki združijo več lokalno parametriziranih odsekov.', en: 'which combine several locally parametrized segments.'},
    },
    'functions-and-calculus': {
        demonstration: 'derivative',
        alt: {sl: 'Graf kvadratne funkcije z označeno tangentno premico pri izbrani točki.', en: 'A quadratic function graph with a tangent line marked at a selected point.'},
        caption: {sl: 'Odvod opiše naklon tangente in lokalno spreminjanje funkcije.', en: 'The derivative describes the tangent slope and local change of a function.'},
        connection: 'analysis',
        connectionReason: {sl: 'kjer metode uporabijo lastnosti funkcij.', en: 'where methods use properties of functions.'},
    },
    analysis: {
        demonstration: 'bisection',
        alt: {sl: 'Graf kvadratne funkcije z intervalom in razpoloviščem pri bisekcijski metodi.', en: 'A quadratic graph with an interval and midpoint for the bisection method.'},
        caption: {sl: 'Bisekcija zožuje interval, v katerem leži ničla funkcije.', en: 'Bisection narrows the interval that contains a function root.'},
        connection: 'functions-and-calculus',
        connectionReason: {sl: 'saj bisekcija išče ničlo funkcije.', en: 'because bisection searches for a function root.'},
    },
} as const;

export function LearningPage() {
    const {language} = useLanguage();
    const location = useLocation();
    const mainRef = useRef<HTMLElement>(null);
    useTypesetMath(mainRef, language);
    const catalog = getDemonstrationCatalog();
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
                    ? 'Teme so urejene v predlaganem vrstnem redu, ki mu lahko slediš ali ga prilagodiš svojim vprašanjem. Poglavja razložijo pojme z branjem; vodene učne poti pa te po korakih vodijo ob grafu.'
                    : 'Topics follow a suggested order that you can follow or adapt to your questions. Chapters explain ideas through reading; guided lessons take you step by step through a graph.'}</p>
                <Link className="learning-open learning-start" to="/bezeg-2.0/learn/foundations">
                    {language === 'sl' ? 'Začni pri osnovah' : 'Start with Foundations'}<span aria-hidden="true"> →</span>
                </Link>
                <nav className="learning-topic-links" aria-label={language === 'sl' ? 'Učne teme' : 'Learning topics'}>
                    {learningChapters.map(chapter => {
                        const family = catalog.families.find(entry => entry.id === chapter.family)!;
                        return <a key={chapter.id} href={`#${chapter.id}`}>{family.title}</a>;
                    })}
                </nav>
            </header>
            {learningChapters.map(chapter => {
                const family = catalog.families.find(entry => entry.id === chapter.family)!;
                const preview = topicPreviews[chapter.id as keyof typeof topicPreviews];
                const demonstrations = family.demonstrations.filter(demo => isGuidedLessonAvailable(demo.id));
                const relatedChapter = learningChapters.find(entry => entry.id === preview.connection)!;
                return <section className="learning-family" id={chapter.id} key={chapter.id} aria-labelledby={`${chapter.id}-heading`}>
                    <h2 className="learning-topic-heading" id={`${chapter.id}-heading`}>{chapter.title[language]}</h2>
                    <div className="learning-family-content">
                        <figure className="learning-preview">
                            <img src={demonstrationPreviewAssets[preview.demonstration]} alt={preview.alt[language]} width="720" height="440" loading="lazy" />
                            <figcaption>{preview.caption[language]}</figcaption>
                        </figure>
                        <div className="learning-card-copy">
                            <p>{chapter.purpose[language]}</p>
                            <p className="learning-connection">{language === 'sl' ? 'Sorodna tema:' : 'Related topic:'} <Link to={`/bezeg-2.0/learn/${relatedChapter.id}`}>{relatedChapter.title[language]}</Link> {preview.connectionReason[language]}</p>
                            <Link className="learning-open" to={`/bezeg-2.0/learn/${chapter.id}`}>
                                {language === 'sl' ? 'Preberi poglavje' : 'Read the chapter'}<span aria-hidden="true"> →</span>
                            </Link>
                            <details className="learning-lessons">
                                <summary>{language === 'sl' ? `Vodene učne poti ob grafih (${demonstrations.length})` : `Guided graph lessons (${demonstrations.length})`}</summary>
                                <ul>{demonstrations.map(demo => <li key={demo.id}>
                                    <Link to={`${demo.path}?learn=1`}>{demo.catalogTitle}</Link>
                                </li>)}</ul>
                            </details>
                        </div>
                    </div>
                </section>;
            })}
        </div>
    </main>;
}

export default LearningPage;
