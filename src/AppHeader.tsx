import React from 'react';
import {Link, NavLink} from 'react-router-dom';
import Logo from './images/elderflower.png';
import {LanguageSelector} from './localization/LanguageSelector';
import {t, useLanguage} from './localization';
import './AppHeader.css';

export function AppHeader() {
    useLanguage();
    return <header className="app-header">
        <Link className="app-brand" to="/bezeg" aria-label={t('bezeg_home')}>
            <img src={Logo} width="34" height="34" alt=""/><span>Bezeg</span>
        </Link>
        <div className="app-header-actions">
            <NavLink className="app-topic-toggle" to="/bezeg/demonstrations">{t('demonstrations')}</NavLink>
            <LanguageSelector compact/>
        </div>
    </header>;
}
