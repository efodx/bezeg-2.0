import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useLanguage} from '../localization';
import {learningChapters} from './learningChapters';

type SectionLink = {id: string; title: string};

export function ChapterContents({sections, showNumbers = false}: {sections: readonly SectionLink[]; showNumbers?: boolean}) {
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
        <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} aria-current={currentSection === section.id ? 'location' : undefined} onClick={event => goToSection(event, section.id)}>{section.title}{showNumbers && <span className="chapter-toc-number">{index + 1}</span>}</a></li>)}</ol>
    </nav>;

    return <>
        <aside className="chapter-sidebar">{contents}</aside>
        <details ref={mobileContentsRef} className="chapter-contents-mobile learning-mobile-contents">
            <summary>{language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}</summary>
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
