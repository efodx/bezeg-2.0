import React, {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Demonstration, FamilyId} from './demonstrations';
import {DemonstrationCollection} from './DemonstrationCollection';
import {useT} from './localization';
import './DemonstrationPicker.css';

/** The native modal owns focus containment and makes the entire document beneath it inert. */
export function DemonstrationPicker({current, onClose, onSelect}: {
    current: Demonstration;
    onClose: () => void;
    onSelect: (entry: Demonstration, lesson: boolean) => void;
}) {
    const t = useT();
    const dialog = useRef<HTMLDialogElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const [topic, setTopic] = useState<FamilyId | null>(current.family);
    const [query, setQuery] = useState('');
    const containFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
        // Search inputs can consume Escape to clear text before the native dialog cancels.
        if (event.key === 'Escape') {event.preventDefault(); onClose(); return;}
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )].filter(element => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) {event.preventDefault(); return;}
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
            event.preventDefault(); first.focus();
        }
    };
    useLayoutEffect(() => {
        const element = dialog.current!;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        element.showModal();
        search.current?.focus({preventScroll: true});
        return () => {
            element.close();
            document.body.style.overflow = previousOverflow;
        };
    }, []);
    return createPortal(<dialog ref={dialog} className="demonstration-picker" aria-labelledby="demonstration-picker-title"
        aria-describedby="demonstration-picker-current" onKeyDown={containFocus} onCancel={event => {event.preventDefault(); onClose();}}>
        <header className="demonstration-picker-heading">
            <div><h2 id="demonstration-picker-title">{t('library_switch')}</h2>
                <p id="demonstration-picker-current">{t('library_current', {value0: current.catalogTitle})}</p></div>
            <button type="button" onClick={onClose}>{t('library_close')}</button>
        </header>
        <DemonstrationCollection mode="picker" topic={topic} query={query} onTopicChange={setTopic} onQueryChange={setQuery}
            currentDemonstrationId={current.id} onSelect={onSelect} searchInputRef={search}/>
    </dialog>, document.body);
}
