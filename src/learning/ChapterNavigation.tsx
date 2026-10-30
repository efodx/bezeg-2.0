import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useLanguage} from '../localization';
import {learningChapters} from './learningChapters';

type SectionLink = {id: string; title: string};

export function ChapterTrail({chapterId}: {chapterId: string}) {
    const {language} = useLanguage();
    const position = learningChapters.findIndex(chapter => chapter.id === chapterId) + 1;
    return <p className="chapter-trail">
        <Link className="learning-back" to={`/bezeg-2.0/learn#${chapterId}`}><span aria-hidden="true">←</span>{language === 'sl' ? 'Vsa učna vsebina' : 'All learning content'}</Link>
        <span className="chapter-trail-position">{language === 'sl' ? `Poglavje ${position} od ${learningChapters.length}` : `Chapter ${position} of ${learningChapters.length}`}</span>
    </p>;
}

function SidebarNeighbors({chapterId}: {chapterId: string}) {
    const {language} = useLanguage();
    const index = learningChapters.findIndex(chapter => chapter.id === chapterId);
    const neighbors = [
        {chapter: learningChapters[index - 1], label: language === 'sl' ? 'Prejšnje poglavje' : 'Previous chapter'},
        {chapter: learningChapters[index + 1], label: language === 'sl' ? 'Naslednje poglavje' : 'Next chapter'},
    ].filter(entry => entry.chapter);
    return <nav className="chapter-toc-neighbors" aria-label={language === 'sl' ? 'Sosednji poglavji' : 'Adjacent chapters'}>
        {neighbors.map(({chapter, label}) => <Link key={chapter.id} to={`/bezeg-2.0/learn/${chapter.id}`}><span>{label}</span>{chapter.title[language]}</Link>)}
    </nav>;
}

export function ChapterContents({sections, chapterId, showNumbers = false}: {sections: readonly SectionLink[]; chapterId: string; showNumbers?: boolean}) {
    const {language} = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [currentSection, setCurrentSection] = useState(() => {
        const hash = location.hash.slice(1);
        return sections.some(section => section.id === hash) ? hash : sections[0]?.id ?? '';
    });
    const mobileContentsRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        let frame = 0;
        const updateCurrentSection = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const sectionsOnPage = sections.map(section => document.getElementById(section.id)).filter((section): section is HTMLElement => Boolean(section));
                const passed = sectionsOnPage.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .32);
                const active = passed[passed.length - 1] ?? sectionsOnPage[0];
                if (active) setCurrentSection(active.id);
            });
        };
        window.addEventListener('scroll', updateCurrentSection, {passive: true});
        window.addEventListener('resize', updateCurrentSection);
        updateCurrentSection();
        return () => {
            window.removeEventListener('scroll', updateCurrentSection);
            window.removeEventListener('resize', updateCurrentSection);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [sections]);

    const goToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setCurrentSection(id);
        if (mobileContentsRef.current) mobileContentsRef.current.open = false;
        navigate({pathname: location.pathname, search: location.search, hash: `#${id}`});
        document.getElementById(id)?.scrollIntoView();
        document.getElementById(`${id}-heading`)?.focus({preventScroll: true});
    };

    const contents = <nav className="chapter-toc" aria-label={language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}>
        <p className="chapter-toc-title">{language === 'sl' ? 'V tem poglavju' : 'In this chapter'}</p>
        <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} aria-current={currentSection === section.id ? 'location' : undefined} onClick={event => goToSection(event, section.id)}><span>{section.title}</span>{showNumbers && <span className="chapter-toc-number">{index + 1}</span>}</a></li>)}</ol>
    </nav>;

    const currentIndex = sections.findIndex(section => section.id === currentSection);
    return <>
        <aside className="chapter-sidebar">{contents}<SidebarNeighbors chapterId={chapterId}/></aside>
        <details ref={mobileContentsRef} className="chapter-contents-mobile learning-mobile-contents">
            <summary><span>{language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}</span>{currentIndex >= 0 && <span className="chapter-contents-position">{language === 'sl' ? `razdelek ${currentIndex + 1} od ${sections.length}` : `section ${currentIndex + 1} of ${sections.length}`}</span>}</summary>
            <div id="chapter-mobile-toc">{contents}</div>
        </details>
    </>;
}

export function ChapterNeighbors({chapterId}: {chapterId: string}) {
    const {language} = useLanguage();
    const index = learningChapters.findIndex(chapter => chapter.id === chapterId);
    const previous = learningChapters[index - 1];
    const next = learningChapters[index + 1];
    return <nav className="learning-neighbors" aria-label={language === 'sl' ? 'Poglavja po vrsti' : 'Chapters in order'}>
        {previous && <Link to={`/bezeg-2.0/learn/${previous.id}`}><span>{language === 'sl' ? 'Prejšnje poglavje' : 'Previous chapter'}:</span> {previous.title[language]}</Link>}
        {next && <Link to={`/bezeg-2.0/learn/${next.id}`}><span>{language === 'sl' ? 'Naslednje poglavje' : 'Next chapter'}:</span> {next.title[language]}</Link>}
    </nav>;
}
