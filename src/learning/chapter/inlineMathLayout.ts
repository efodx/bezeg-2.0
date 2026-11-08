/** Keep inline notation in the sentence unless its typeset width reaches beyond its reading measure. */
function fitChapterInlineMath(article: HTMLElement, language: 'sl' | 'en') {
    const math = article.querySelectorAll<HTMLElement>(
        '.chapter-paragraph mjx-container:not([display="true"]), .chapter-exploration-prompt mjx-container:not([display="true"])',
    );
    for (const expression of math) {
        if (expression.dataset.chapterScrollableMath) {
            expression.removeAttribute('role');
            expression.removeAttribute('tabindex');
            expression.removeAttribute('aria-label');
            expression.removeAttribute('data-chapter-scrollable-math');
        }
        const readingMeasure = expression.closest<HTMLElement>('.chapter-paragraph, .chapter-exploration-prompt');
        if (!readingMeasure) continue;
        const bounds = expression.getBoundingClientRect();
        const measureBounds = readingMeasure.getBoundingClientRect();
        const mathContent = expression.querySelector<HTMLElement>('mjx-math');
        const contentWidth = mathContent?.getBoundingClientRect().width ?? bounds.width;
        const containerOverflow = expression.clientWidth > 0 && expression.scrollWidth > expression.clientWidth + 1;
        const exceedsReadingMeasure = Math.max(bounds.width, contentWidth) > readingMeasure.clientWidth + 1;
        const extendsPastReadingMeasure = bounds.right > measureBounds.right + 8;
        if (!containerOverflow && !exceedsReadingMeasure && !extendsPastReadingMeasure) continue;

        expression.dataset.chapterScrollableMath = 'true';
        expression.setAttribute('role', 'region');
        expression.setAttribute('aria-label', language === 'sl' ? 'Matematični izraz' : 'Mathematical expression');
        expression.tabIndex = 0;
    }
}

export function observeChapterInlineMath(article: HTMLElement, language: 'sl' | 'en') {
    let frame = 0;
    // Schedule outside the resize notification because reflow can change the article height.
    const schedule = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            fitChapterInlineMath(article, language);
        });
    };

    fitChapterInlineMath(article, language);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(article);
    document.fonts?.addEventListener('loadingdone', schedule);
    return () => {
        observer?.disconnect();
        document.fonts?.removeEventListener('loadingdone', schedule);
        cancelAnimationFrame(frame);
    };
}
