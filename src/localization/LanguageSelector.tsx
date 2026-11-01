import React from 'react';
import {setLanguage, t, useLanguage, Language} from './index';

export function LanguageSelector({compact = false}: {compact?: boolean}) {
    const {language, persistenceFailed, locked} = useLanguage();
    return <div className="language-selector">
        <label className={compact ? 'visually-hidden' : undefined} htmlFor="bezeg-language">{t('language')}</label>{' '}
        <select id="bezeg-language" value={language} disabled={locked}
            aria-describedby={locked ? 'language-export-notice' : persistenceFailed ? 'language-storage-notice' : undefined}
            onChange={event => setLanguage(event.target.value as Language)}>
            <option value="sl" lang="sl" aria-label="Slovenščina">{compact ? 'SL' : 'Slovenščina'}</option>
            <option value="en" lang="en" aria-label="English">{compact ? 'EN' : 'English'}</option>
        </select>
        {locked && <small id="language-export-notice" role="status">{t('language_switching_is_unavailable_while_exporting_figures')}</small>}
        {persistenceFailed && <small id="language-storage-notice" role="status">{t('cannot_remember_the_language_choice_it_applies_to_this_session')}</small>}
    </div>;
}
