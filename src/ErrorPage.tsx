import {useT} from "./localization";
import {LanguageSelector} from "./localization/LanguageSelector";
export function ErrorPage({embedded = false}: {embedded?: boolean}) {
    const t = useT();
    return (
        <main className="learning-page">
            {!embedded && <LanguageSelector/>}
            <h1>{t("unable_to_open_this_page_return_to_bezeg_and_choose_a_demonstration")}</h1>
            <p><a href="/bezeg-2.0">{t("bezeg_home")}</a></p>
            <p><a href="/bezeg-2.0/learn">{t('learning')}</a> · <a href="/bezeg-2.0/demonstrations">{t('demonstrations')}</a></p>
        </main>
    );
}
