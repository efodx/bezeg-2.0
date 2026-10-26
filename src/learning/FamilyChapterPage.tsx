import React, {useEffect, useMemo, useRef} from 'react';
import {Link, useLocation, useParams} from 'react-router-dom';
import {ErrorPage} from '../ErrorPage';
import {getDemonstrationCatalog} from '../demonstrations';
import {useLanguage} from '../localization';
import {typesetMath} from '../mathjax/loadMathJax';
import {familyChapters} from './content/familyChapters';
import type {FamilyChapter} from './content/familyChapters';
import {ChapterContents, ChapterNeighbors} from './ChapterNavigation';
import {isGuidedLessonAvailable} from './runtime/lessonAvailability';
import './ChapterPage.css';
import './LearningPage.css';

function ChapterReading({chapter}: {chapter: FamilyChapter}) {
    const {language} = useLanguage();
    const location = useLocation();
    const articleRef = useRef<HTMLElement>(null);
    const catalog = getDemonstrationCatalog();
    const family = catalog.families.find(entry => entry.id === chapter.family)!;
    const contentsSections = useMemo(() => chapter.sections.map(section => ({id: section.id, title: section.title[language]})), [chapter, language]);

    useEffect(() => {
        const article = articleRef.current;
        if (!article) return;
        let disposed = false;
        const settle = () => {
            if (disposed) return;
            const id = location.hash.slice(1);
            if (id && chapter.sections.some(section => section.id === id)) {
                document.getElementById(id)?.scrollIntoView();
                document.getElementById(`${id}-heading`)?.focus({preventScroll: true});
            }
        };
        void typesetMath(article, () => !disposed).then(settle, settle);
        return () => { disposed = true; };
    }, [chapter, language, location.hash]);

    useEffect(() => {
        if (!location.hash) {
            window.scrollTo(0, 0);
            document.getElementById('chapter-title')?.focus({preventScroll: true});
        }
    // A new chapter starts at its heading; language switches preserve the reading position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapter.id]);

    return <main className="chapter-page">
        <div className="chapter-layout">
            <ChapterContents sections={contentsSections}/>
            <article className="chapter-article" ref={articleRef}>
                <header className="chapter-heading">
                    <Link className="learning-back" to={`/bezeg-2.0/learn#${chapter.id}`}>{language === 'sl' ? 'Vsa učna vsebina' : 'All learning content'}<span aria-hidden="true"> ←</span></Link>
                    <h1 id="chapter-title" tabIndex={-1}>{chapter.title[language]}</h1>
                    <p className="chapter-purpose">{chapter.purpose[language]}</p>
                    <div className="chapter-prerequisites"><strong>{language === 'sl' ? 'Predznanje' : 'Prerequisites'}</strong><p>{chapter.prerequisites[language]}</p></div>
                </header>
                {chapter.sections.map(section => <section className="chapter-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <div className="chapter-section-heading"><h2 id={`${section.id}-heading`} tabIndex={-1}>{section.title[language]}</h2><a className="chapter-section-link" href={`#${section.id}`} aria-label={`${language === 'sl' ? 'Povezava do razdelka' : 'Link to section'}: ${section.title[language]}`}>¶</a></div>
                    <div className="chapter-section-body">
                        {section.paragraphs.map((paragraph, paragraphIndex) => <p className="chapter-paragraph" key={paragraphIndex}>{paragraph[language]}</p>)}
                        {section.formula && <div className="chapter-formula" role="region" aria-label={section.title[language]} tabIndex={0}><div className="chapter-math">\[{section.formula}\]</div></div>}
                        {section.figures?.map((figure, figureIndex) => <figure className="chapter-activity-figure" key={figureIndex}>
                            <img src={figure.src} alt={figure.alt[language]} width="720" height="440" loading="lazy"/>
                            <figcaption>{figure.caption[language]}</figcaption>
                        </figure>)}
                        {section.demonstrationIds?.length && <div className="learning-investigations">
                            <h3>{language === 'sl' ? 'Razišči ob grafu' : 'Explore with a graph'}</h3>
                            <ul>{section.demonstrationIds.map(id => {
                                const demo = catalog.demonstrations.find(entry => entry.id === id)!;
                                const prompt = section.investigationPrompts?.[id];
                                const guided = isGuidedLessonAvailable(id);
                                return <li key={id}>
                                    <Link to={demo.path + (guided ? '?learn=1' : '')}>{demo.catalogTitle}{prompt && guided ? ' — ' + (language === 'sl' ? 'Vodena učna ura' : 'Guided graph lesson') : ''}</Link>
                                    {prompt && <p className="learning-investigation-prompt">{prompt[language]}</p>}
                                </li>;
                            })}</ul>
                        </div>}
                    </div>
                </section>)}
                <footer className="chapter-source">
                    <p>{language === 'sl' ? `To je prvi osnutek poglavja za področje ${family.title}. Razlage poveži z vodenimi prikazi; slika ponazarja trditev, splošne veljavnosti pa sama ne dokazuje.` : `This is a first draft for ${family.title}. Read alongside the guided demonstrations; a picture illustrates a claim but does not by itself prove it in general.`}</p>
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
