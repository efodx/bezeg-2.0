import React, {useEffect, useRef} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {ErrorPage} from '../ErrorPage';
import {getDemonstrationCatalog} from '../demonstrations';
import {useLanguage} from '../localization';
import {typesetMath} from '../mathjax/loadMathJax';
import {familyChapters} from './content/familyChapters';
import type {FamilyChapter} from './content/familyChapters';
import {learningChapters} from './learningChapters';
import {isGuidedLessonAvailable} from './runtime/lessonAvailability';
import './ChapterPage.css';
import './LearningPage.css';

function ChapterReading({chapter}: {chapter: FamilyChapter}) {
    const {language} = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const articleRef = useRef<HTMLElement>(null);
    const catalog = getDemonstrationCatalog();
    const family = catalog.families.find(entry => entry.id === chapter.family)!;
    const index = learningChapters.findIndex(entry => entry.id === chapter.id);
    const neighbors = [learningChapters[index - 1], learningChapters[index + 1]].filter(Boolean);

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

    const goToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate({pathname: location.pathname, search: location.search, hash: `#${id}`});
        document.getElementById(id)?.scrollIntoView();
        document.getElementById(`${id}-heading`)?.focus({preventScroll: true});
    };

    const contents = <nav className="chapter-toc" aria-label={language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}>
        <p className="chapter-toc-title">{language === 'sl' ? 'V tem poglavju' : 'In this chapter'}</p>
        <ol>{chapter.sections.map(section => <li key={section.id}><a href={`#${section.id}`} aria-current={location.hash === `#${section.id}` ? 'location' : undefined} onClick={event => goToSection(event, section.id)}>{section.title[language]}</a></li>)}</ol>
    </nav>;

    return <main className="chapter-page">
        <div className="chapter-layout">
            <aside className="chapter-sidebar">{contents}</aside>
            <details className="chapter-contents-mobile learning-mobile-contents"><summary>{language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}</summary>{contents}</details>
            <article className="chapter-article" ref={articleRef}>
                <header className="chapter-heading">
                    <Link className="learning-back" to={`/bezeg-2.0/learn#${chapter.id}`}>{language === 'sl' ? 'Vsa učna vsebina' : 'All learning content'}<span aria-hidden="true"> ←</span></Link>
                    <h1 id="chapter-title" tabIndex={-1}>{chapter.title[language]}</h1>
                    <p className="chapter-purpose">{chapter.purpose[language]}</p>
                    <div className="chapter-prerequisites"><strong>{language === 'sl' ? 'Predznanje' : 'Prerequisites'}</strong><p>{chapter.prerequisites[language]}</p></div>
                </header>
                {chapter.sections.map(section => <section className="chapter-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <div className="chapter-section-heading"><h2 id={`${section.id}-heading`} tabIndex={-1}>{section.title[language]}</h2><a className="chapter-section-link" href={`#${section.id}`} onClick={event => goToSection(event, section.id)} aria-label={`${language === 'sl' ? 'Povezava do razdelka' : 'Link to section'}: ${section.title[language]}`}>¶</a></div>
                    <div className="chapter-section-body">
                        {section.paragraphs.map((paragraph, paragraphIndex) => <p className="chapter-paragraph" key={paragraphIndex}>{paragraph[language]}</p>)}
                        {section.formula && <div className="chapter-formula" role="region" aria-label={section.title[language]} tabIndex={0}><div className="chapter-math">\[{section.formula}\]</div></div>}
                        {section.demonstrationIds?.length && <div className="learning-investigations">
                            <h3>{language === 'sl' ? 'Razišči ob grafu' : 'Explore with a graph'}</h3>
                            <ul>{section.demonstrationIds.map(id => {
                                const demo = catalog.demonstrations.find(entry => entry.id === id)!;
                                return <li key={id}><Link to={`${demo.path}${isGuidedLessonAvailable(id) ? '?learn=1' : ''}`}>{demo.catalogTitle}</Link></li>;
                            })}</ul>
                        </div>}
                    </div>
                </section>)}
                <footer className="chapter-source">
                    <p>{language === 'sl' ? `To je prvi osnutek poglavja za področje ${family.title}. Razlage poveži z vodenimi prikazi; slika ponazarja trditev, splošne veljavnosti pa sama ne dokazuje.` : `This is a first draft for ${family.title}. Read alongside the guided demonstrations; a picture illustrates a claim but does not by itself prove it in general.`}</p>
                    <nav className="learning-neighbors" aria-label={language === 'sl' ? 'Povezana poglavja' : 'Related chapters'}>
                        {neighbors.map(neighbor => <Link key={neighbor.id} to={`/bezeg-2.0/learn/${neighbor.id}`}>{neighbor.title[language]}</Link>)}
                    </nav>
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
