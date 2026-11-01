import {Language, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';

function refusalIn(language: Language, run: () => void): string {
    setLanguage(language);
    let caught: unknown;
    try {
        run();
    } catch (error) {
        caught = error;
    }
    if (!(caught instanceof DomainError)) throw new Error('expected the action to be refused with a DomainError');
    return caught.message;
}

/**
 * The text of the `DomainError` that `run` throws while Slovenian is active and while English is active (a learner reads the error in
 * the language it was thrown in, so numbers follow it); restores Slovenian.
 */
export function refusalTexts(run: () => void): { sl: string; en: string } {
    try {
        return {sl: refusalIn('sl', run), en: refusalIn('en', run)};
    } finally {
        setLanguage('sl');
    }
}
