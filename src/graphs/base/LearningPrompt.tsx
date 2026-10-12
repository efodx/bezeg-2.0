import React, {useState} from 'react';
import {useT} from '../../localization';
import {findDemonstration} from '../../demonstrations';

export function LearningPrompt({pathname}: {pathname: string}) {
    const t = useT();
    const [index, setIndex] = useState(0);
    const prompts = findDemonstration(pathname)?.prompts ?? [t('change_the_settings_and_observe_their_effect_on_the_graph'), t('prompt_compare')];
    return <section className="workspace-learning" aria-label={t('try_and_observe')}>
        <span>{t('try_and_observe')}</span>
        <p aria-live="polite">{prompts[index]}</p>
        <button onClick={() => setIndex((index + 1) % prompts.length)}>{t('next_prompt')}</button>
    </section>;
}
