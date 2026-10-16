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
            <svg className="demonstration-picker-botanical" viewBox="0 0 180 120" aria-hidden="true" focusable="false">
                <path d="M174 118C145 91 126 60 111 5M145 91C155 69 166 56 179 48M128 67C107 63 91 51 77 29M157 101C172 94 178 83 184 69"/>
                <path d="M143 90C140 69 150 54 170 46C167 67 158 82 143 90ZM126 65C105 67 91 55 80 34C101 36 117 47 126 65ZM157 100C157 82 166 70 183 66C180 84 171 96 157 100Z"/>
                <g><circle cx="171" cy="42" r="4"/><circle cx="163" cy="39" r="3"/><circle cx="179" cy="36" r="3"/><circle cx="165" cy="48" r="3"/><circle cx="178" cy="49" r="3"/><circle cx="172" cy="31" r="3"/></g>
                <g><circle cx="77" cy="28" r="3.5"/><circle cx="70" cy="25" r="2.8"/><circle cx="84" cy="22" r="2.8"/><circle cx="71" cy="34" r="2.8"/><circle cx="83" cy="35" r="2.8"/><circle cx="78" cy="17" r="2.8"/></g>
            </svg>
            <div><h2 id="demonstration-picker-title">{t('library_switch')}</h2>
                <p id="demonstration-picker-current">{t('library_current', {value0: current.catalogTitle})}</p></div>
            <button type="button" onClick={onClose}>{t('library_close')}</button>
        </header>
        <DemonstrationCollection mode="picker" topic={topic} query={query} onTopicChange={setTopic} onQueryChange={setQuery}
            currentDemonstrationId={current.id} onSelect={onSelect} searchInputRef={search}/>
    </dialog>, document.body);
}
