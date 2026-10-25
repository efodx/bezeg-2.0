import React, {useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useLanguage} from '../localization';
import {getDemonstrationCatalog} from '../demonstrations';
import {isGuidedLessonAvailable} from './runtime/lessonAvailability';
import {learningChapters} from './learningChapters';
import {useTypesetMath} from './useTypesetMath';
import './LearningPage.css';

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
                <p>{language === 'sl' ? 'Na enem mestu najdeš poglavja za branje in vodene razlage ob grafih. Začni pri osnovah ali izberi temo, ki te zanima. Vsa poglavja in prikazi so dostopni v poljubnem vrstnem redu.' : 'Find reading chapters and guided graph lessons in one place. Start with foundations or choose a topic that interests you. Every chapter and demonstration is available in any order.'}</p>
                <nav className="learning-topic-links" aria-label={language === 'sl' ? 'Učne teme' : 'Learning topics'}>
                    {learningChapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`}>{catalog.families.find(family => family.id === chapter.family)?.title}</a>)}
                </nav>
            </header>
            {learningChapters.map(chapter => {
                const family = catalog.families.find(entry => entry.id === chapter.family)!;
                return <section className="learning-family" id={chapter.id} key={chapter.id} aria-labelledby={`${chapter.id}-heading`}>
                    <div className="learning-family-heading"><h2 id={`${chapter.id}-heading`}>{family.title}</h2></div>
                    <div className="learning-family-content">
                        <div className="learning-card-copy">
                            <h3><Link to={`/bezeg-2.0/learn/${chapter.id}`}>{chapter.title[language]}</Link></h3>
                            <p>{chapter.purpose[language]}</p>
                            <p className="learning-prerequisite"><strong>{language === 'sl' ? 'Predznanje:' : 'Prerequisites:'}</strong> {chapter.prerequisites[language]}</p>
                            <Link className="learning-open" to={`/bezeg-2.0/learn/${chapter.id}`}>{language === 'sl' ? 'Odpri poglavje' : 'Read the chapter'}<span aria-hidden="true"> →</span></Link>
                        </div>
                        <div className="learning-lessons">
                            <h3>{language === 'sl' ? 'Vodene učne poti ob grafih' : 'Guided graph lessons'}</h3>
                            <ul>{family.demonstrations.filter(demo => isGuidedLessonAvailable(demo.id)).map(demo => <li key={demo.id}>
                                <Link to={`${demo.path}?learn=1`}>{demo.catalogTitle}</Link>
                            </li>)}</ul>
                        </div>
                    </div>
                </section>;
            })}
        </div>
    </main>;
}

export default LearningPage;
