import {t, useLanguage} from "./localization";
import {LanguageSelector} from "./localization/LanguageSelector";
export function ErrorPage() {
    useLanguage();
    return (
        <div>
            <LanguageSelector/>
            {t("unable_to_open_this_page_return_to_bezeg_and_choose_a_demonstration")}
            <p><a href="/bezeg">{t("bezeg_home")}</a></p>
        </div>
    );
}
