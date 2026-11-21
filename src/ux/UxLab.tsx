import {useEffect} from "react";
import "./UxLab.css";

interface LabLink {
    label: string;
    family: string;
    href: string;
    tryThis: string;
}

interface Prototype {
    id: string;
    name: string;
    borrowed: string;
    idea: string;
    generalizes: string;
    links: LabLink[];
}

const BASE = '/bezeg-2.0';

/** Best first. */
const PROTOTYPES: Prototype[] = [
    {
        id: 'c24',
        name: 'Kako je odvisno?',
        borrowed: '»Up and Down the Ladder of Abstraction« Breta Victorja, parametrični preleti v znanosti in osciloskop',
        idea: 'Vsako število, ki ga tabla izpiše (ploščina, dolžina loka, verjetnost, vsota), se nariše v odvisnosti od izbranega parametra: en prelet drsnika čez celoten razpon nariše krivuljo odvisnosti, števila, ki se ne spremenijo, pa postanejo črtkane referenčne črte. Pika nato sledi drsniku, vlečenje po grafu odvisnosti pa premika tablo. Študent se povzpne od ene slike do funkcije za vsemi slikami: Riemannova vsota pred očmi zleze k integralu.',
        generalizes: 'Števila se preberejo iz besedil na tabli (oznaka in vrednost, z enotami % in °), ključ je oznaka, zato preživijo prerisovanje osi. Parametri so vsi priključeni drsniki iz skupnega Slider, tudi skriti v lekcijah. Brez podatkov deluje v funkcijah, geometriji krivulj, verjetnosti in Bézierjevih lekcijah z izpisi.',
        links: [
            {label: 'Določeni integral', family: 'Funkcije', href: `${BASE}/functions/integral?ux=c24`,
                tryThis: 'Odpri 📈 Kako je odvisno? od n: vsota se z rastočim n približuje črtkani črti integrala 2,67. Zamenjaj na b in spodaj izberi integral: ploščina kot funkcija meje je b³/3.'},
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?ux=c24`,
                tryThis: 'Izberi σ: verjetnost med a in b z rastočim σ pada. Nato μ: zvonasta krivulja verjetnosti, največja pri μ = 0.'},
            {label: 'Parametrične krivulje (cikloida)', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/parametric?learn=1&ux=c24`,
                tryThis: 'Izberi Polmer: dolžina loka cikloide je premica (8R), ploščina parabola (3πR²). Preklopi med njima s čipoma spodaj.'},
            {label: 'Dolžina loka Bézierjeve krivulje', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/arc-length?ux=c24`,
                tryThis: 'Izberi Lega (parameter t): dolžina loka s(t) narašča od 0 do L, črtkana črta je celotna dolžina L; krivulja ni premica, zato enaki koraki v t niso enaki koraki po loku.'},
        ],
    },
    {
        id: 'c30',
        name: 'Odkrij zakon',
        borrowed: 'Kepler, ki je iz Tychovih tabel izluščil zakon, prilagajanje krivulj v fizikalnem laboratoriju in regresija v Desmosu',
        idea: 'Po preletu iz c24 tabla poišče najpreprostejši zakon, ki pojasni odvisnost (sorazmernost, linearna, potenca, polinom, približevanje meji), in konstante zapiše natančno, kjer so lepe: dolžina loka cikloide = 8·R, ploščina = 3π·R², integral = 1/3·b³, Riemannova vsota = 8/3 − 4/n + 4/(3n²) gre proti 8/3. Študent ne vidi le, da število raste, ampak zakaj in koliko.',
        generalizes: 'Deluje na vsakem preletu c24: modeli se prilagajajo z najmanjšimi kvadrati, sprejmejo se le skoraj popolna ujemanja, konstante pa se prepoznajo kot cela števila, ulomki, večkratniki π in koreni. Kjer preprostega zakona ni (verjetnost pri normalni porazdelitvi), ne izmisli ničesar.',
        links: [
            {label: 'Parametrične krivulje (cikloida)', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/parametric?learn=1&ux=c30`,
                tryThis: 'Odpri 📈 in izberi Polmer: »Zakon: Dolžina loka = 8·Polmer«. Spodaj izberi Ploščina: 3π·Polmer².'},
            {label: 'Določeni integral', family: 'Funkcije', href: `${BASE}/functions/integral?ux=c30`,
                tryThis: 'Pri n se pokaže natančna formula leve vsote 8/3 − 4/n + 4/(3n²) in njena meja 8/3. Izberi b in spodaj integral: 1/3·b³.'},
            {label: 'Določeni integral z vlečenjem', family: 'Funkcije', href: `${BASE}/functions/integral?ux=c30,c26`,
                tryThis: 'Zakon deluje tudi na tvoji sledi: odpri 〰️ Sled vlečenja, povleci mejo b tja in nazaj in izberi integral: 1/3·x_b³.'},
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?ux=c30`,
                tryThis: 'Izberi σ: verjetnost med a in b pada, a preprostega zakona ni (gre za funkcijo napake), zato tabla zakona ne izmisli.'},
        ],
    },
    {
        id: 'c26',
        name: 'Sled vlečenja',
        borrowed: 'merilnik podatkov iz šolskega laboratorija, sled (trace) v Desmosu in seizmograf',
        idea: 'Medtem ko študent vleče katero koli točko na tabli, se vsako izpisano število zapiše v odvisnosti od lege točke: števila, ki se spreminjajo, pustijo sled pik, ki se zloži v graf odvisnosti. Števila, ki se ob vlečenju sploh ne premaknejo, se zberejo pod »Ostane enako« in narišejo kot vodoravna vrsta pik, zato študent nespremenljivko (obodni kot, vsoto kotov, razmerje 2 : 1) odkrije z lastno roko.',
        generalizes: 'Uporablja iste izpise s table kot c24 in vse premične točke JSXGraph (proste točke in drsalce na krivuljah), os pa izbere sámo: lego drsalca na krivulji ali koordinato, ki se je bolj spremenila. Brez podatkov deluje v geometriji ravnine, funkcijah, verjetnosti in Bézierjevih lekcijah.',
        links: [
            {label: 'Obodni kot in Talesov izrek', family: 'Geometrija ravnine', href: `${BASE}/inscribed-angle?ux=c26`,
                tryThis: 'Odpri 〰️ Sled vlečenja in vleci točko P po krožnici: pike za ∠APB ostanejo v vodoravni vrsti, spodaj pa se zbere »Ostane enako: ∠APB = ∠ACB, središčni kot je dvakratnik«. Nato povleci oglišče P₃: zdaj se kot spreminja.'},
            {label: 'Določeni integral', family: 'Funkcije', href: `${BASE}/functions/integral?ux=c26`,
                tryThis: 'Vleci mejo b po osi x tja in nazaj: pike vsote rišejo, kako ploščina raste z b. S čipom zamenjaj na integral: krivulja b³/3.'},
            {label: 'Naravna parametrizacija (dolžina loka)', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/arc-length?ux=c26`,
                tryThis: 'Vleci kontrolno točko p₁ gor in dol: sled pokaže, kako se dolžina krivulje L spreminja z lego točke, in kje je najkrajša.'},
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?ux=c26`,
                tryThis: 'Vleci mejo a od leve proti desni: sled verjetnosti med a in b je zrcalna slika zvonaste porazdelitve.'},
        ],
    },
    {
        id: 'c29',
        name: 'Najprej napoved',
        borrowed: 'delovni list v laboratoriju (»napovej, preden poženeš poskus«) in kontrolne točke v igrah',
        idea: 'V vodeni lekciji Naprej na okvirju, ki na tabli izpiše števila, najprej odpre vprašanje iz c28: kaj se zgodi s številom, ko parameter raste? Študent odgovori z enim tapom in prelet pokaže resnico, ali pa z gumbom Naprej nadaljuje brez napovedi; lekcija tako postane zaporedje majhnih poskusov namesto branja.',
        generalizes: 'Ne potrebuje podatkov o lekciji: prestreže gumb Naprej v skupnem izvajalniku lekcij in vpraša le na okvirjih, kjer tabla izpiše števila in obstaja drsnik. Vsak okvir vpraša največ enkrat, drugi Naprej vedno nadaljuje, zato lekcije nikoli ne zaklene.',
        links: [
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?learn=1&ux=c29`,
                tryThis: 'Pritisni Naprej: preden se lekcija premakne, vpraša, kaj se zgodi s ploščino, ko se zvon premika (μ). Odgovori in opazuj prelet.'},
            {label: 'Parametrične krivulje (cikloida)', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/parametric?learn=1&ux=c29`,
                tryThis: 'Prvo vprašanje je past: celotna dolžina loka se s t ne spremeni. Zamenjaj na Polmer in odgovori znova.'},
            {label: 'Določeni integral', family: 'Funkcije', href: `${BASE}/functions/integral?learn=1&ux=c29`,
                tryThis: 'Pojdi skozi lekcijo z Naprej: vsak okvir s številom vsote vpraša, kaj se z njo zgodi, ko raste n ali meja.'},
            {label: 'Obodni kot in Talesov izrek', family: 'Geometrija ravnine', href: `${BASE}/inscribed-angle?learn=1&ux=c29`,
                tryThis: 'Na okvirjih z drsnikom t lekcija vpraša o ∠APB; odgovor »ostane enaka« je skoraj pravilen, prelet pokaže skok na nasprotnem loku.'},
        ],
    },
    {
        id: 'c21',
        name: 'Kaj je novo?',
        borrowed: 'primerjava različic kode (diff), »smart animate« v Figmi in muzejska vitrina, ki osvetli, o čemer govori vodnik',
        idea: 'Ob vsakem koraku lekcije tabla pokaže, kaj je korak naredil: nove in spremenjene črte dvakrat zažarijo, izginule zbledijo kot siv duh, premaknjene točke pa pustijo puščico od tam, kjer so bile. Oznaka na vrhu pove po slovensko, kaj se je zgodilo (»2 novi črti · 1 točka se premakne«), tap nanjo pa spremembo pokaže znova.',
        generalizes: 'Primerja se kar narisan SVG table pred korakom in po njem (oblika, barva, črtkanost), točke z imenom pa po imenu; neimenovane točke in črte se sparijo po videzu. Ne potrebuje nobenih podatkov o lekciji in deluje na vsakem prehodu okvirja v vseh družinah; sprememba pogleda (povečava) se ne šteje.',
        links: [
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c21`,
                tryThis: 'Klikaj Naprej: v vsakem koraku zažarijo nove simetrale ali višine in nova krožnica, prejšnje pomožne črte pa zbledijo.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c21`,
                tryThis: 'Dvakrat Naprej: parabola zažari na novem mestu, stara zbledi, puščica pa pokaže, da gre točka (2, 4) v (2, 5), natanko kot pravi besedilo.'},
            {label: 'Bernsteinovi polinomi', family: 'Bézierjeve osnove', href: `${BASE}/bernstein?learn=1&ux=c21`,
                tryThis: 'Klikni Naprej do drugega koraka: štiri bazne funkcije stopnje 3 zažarijo, premici stopnje 1 pa zbledita kot duh.'},
            {label: 'De Boorov algoritem', family: 'B-zlepki', href: `${BASE}/bspline/deboor?learn=1&ux=c21`,
                tryThis: 'Dvakrat Naprej: nova točka konstrukcije zažari, sivi duh spremenjene črte pa pokaže, kje je bila prej.'},
        ],
    },
    {
        id: 'c8',
        name: 'Živo besedilo',
        borrowed: 'reaktivni dokumenti Breta Victorja, »Explorable Explanations« in barvno označene enačbe',
        idea: 'Matematika v besedilu lekcije kaže na graf: koordinata, kot je (0, 4), na tabli zabode žebljiček z vodili do osi in prižge krivuljo ali točko, ki je tam, formula y = (x − 3)² + 1 prižge krivuljo, ki ji ustreza, simboli pa so obarvani z barvo svojega predmeta. Vrednost, kot je t = 1/2 ▸, s klikom zapelje drsnik do sebe, na telefonu pa se graf, ko je odmaknjen z zaslona, pokaže v plavajočem oknu.',
        generalizes: 'Vse se prebere iz že stavljenega TeX-a in narisane table: pari števil postanejo točke, formule oblike y = … ali f(x) = … se izračunajo in primerjajo z vsako narisano krivuljo (ujemati se mora 90 % vzorcev v pogledu), simboli se ujemajo z oznakami na tabli ali z definicijami, kot je A = (0, 0), vrednosti pa z znakom v imenu drsnika. Nobena lekcija ne potrebuje dodatnih podatkov.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c8`,
                tryThis: 'V prvem okvirju pokaži na (0, 4): zasvetita točka in obe daljici, ki gresta skozi njo. Na telefonu tapni t = 1/2 ▸ in opazuj, kako se konstrukcija v plavajočem oknu premakne.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c8`,
                tryThis: 'Dvakrat klikni Naprej in pokaži na y = x² + 1, nato na (2, 4) in (2, 5): vidiš, katera točka leži na kateri paraboli.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c8`,
                tryThis: 'Pokaži na A = (0, 0), B, C in nato na G: težišče dobi obroček in koordinate. Obratno: pokaži na točko na grafu in v besedilu zasvetijo formule o njej.'},
            {label: 'Bernsteinovi polinomi', family: 'Bézierjeve osnove', href: `${BASE}/bernstein?learn=1&ux=c8`,
                tryThis: 'Pokaži na B₀¹(t) = 1 − t in na B₁¹(t) = t: vsaka formula prižge svojo premico in je obarvana z njeno barvo.'},
        ],
    },
    {
        id: 'c28',
        name: 'Kaj se zgodi?',
        borrowed: 'vprašanja »kaj misliš, da se zgodi« iz Brilliant in Duolingo ter interaktivni poskusi v znanstvenih muzejih',
        idea: 'Tabla sama sestavi vprašanje iz števil, ki jih izpiše, in iz drsnikov: »Kaj se zgodi s ploščino, ko σ raste od 0,1 do 20?« Študent tapne enega od petih odgovorov (raste, pada, ostane enaka, najprej raste in nato pada, najprej pada in nato raste), nato drsnik sam preleti ves razpon, nariše resnično odvisnost in jo primerja z odgovorom, tudi kadar je resnica skok (obodni kot na nasprotnem loku).',
        generalizes: 'Uporablja iste izpise s table in iste drsnike kot c24, oblika odvisnosti pa se razvrsti iz preleta (monotono, vrh, dno, konstanta, skoki) z dopustnim odstopanjem za zaokrožene izpise. En tap namesto risanja, zato dobro deluje na telefonu; brez podatkov o lekciji deluje v funkcijah, verjetnosti, geometriji krivulj in ravnine ter Bézierjevih lekcijah.',
        links: [
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?ux=c28`,
                tryThis: 'Tapni ❓ Kaj se zgodi?, izberi σ in ugani, kaj se zgodi s ploščino med a in b, ko se zvon širi.'},
            {label: 'Obodni kot in Talesov izrek', family: 'Geometrija ravnine', href: `${BASE}/inscribed-angle?ux=c28`,
                tryThis: 'Vprašanje o ∠APB, ko t teče okoli krožnice: večina reče »ostane enaka«, prelet pa pokaže skok na nasprotnem loku (180° − 66,8°).'},
            {label: 'Naravna parametrizacija', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/arc-length?ux=c28`,
                tryThis: 'Kaj se zgodi z dolžino L, ko N raste? Past: N je le število delov, dolžina krivulje ostane enaka.'},
            {label: 'Parametrične krivulje (cikloida)', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/parametric?learn=1&ux=c28`,
                tryThis: 'V lekciji izberi Polmer: dolžina loka raste premo sorazmerno; nato zamenjaj na ploščino.'},
        ],
    },
    {
        id: 'c25',
        name: 'Napovej odvisnost',
        borrowed: 'napovej, nato opazuj iz simulacij PhET in dejavnosti Desmos',
        idea: 'Različica c24, ki najprej vpraša: graf odvisnosti je prazen, študent pa s prstom nariše, kako misli, da se bo število na tabli (vsota, verjetnost, dolžina loka) spreminjalo s parametrom. Šele Preveri napoved požene prelet: resnica se nariše čez modro napoved, ujemanje oblike pa dobi odstotek in zvezdice.',
        generalizes: 'Uporablja iste izpise s table in iste drsnike kot c24, zato deluje povsod, kjer deluje c24. Oblika se primerja v lastnem okviru grafa (več/manj), zato študentu ni treba poznati merila, le smer in ukrivljenost.',
        links: [
            {label: 'Določeni integral', family: 'Funkcije', href: `${BASE}/functions/integral?ux=c25`,
                tryThis: 'Napovej, kako se Riemannova vsota spreminja z n: raste? pada? se ustali? Nariši in pritisni Preveri napoved.'},
            {label: 'Parametrične krivulje (cikloida)', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/parametric?learn=1&ux=c25`,
                tryThis: 'Izberi Polmer in napovej dolžino loka. Veliko jih nariše parabolo, resnica pa je premica 8R; nato napovej še ploščino.'},
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?learn=1&ux=c25`,
                tryThis: 'Izberi σ in napovej, kaj se zgodi z verjetnostjo med a in b, ko se zvon širi.'},
        ],
    },
    {
        id: 'c15',
        name: 'Vleci število',
        borrowed: 'Tangle in »Explorable Explanations« Breta Victorja: števila v besedilu so ročice',
        idea: 'Vrednost, ki jo besedilo lekcije navaja, na primer t = 1/2 ali ω = 1, primeš kar v stavku in jo vlečeš levo ali desno: graf sledi, oblaček nad formulo kaže trenutno vrednost ob vrednosti iz besedila. Sprememba teče v razcepu c14, zato bledi duh pokaže lekcijo, na telefonu pa ob vleku priplava živa slika grafa.',
        generalizes: 'Prireditve se preberejo iz že stavljenega TeX-a v okvirju, simbol pa se ujame s skupnim Slider po znaku na koncu imena (t, ω, φ, d), tudi ko lekcija drsnike skriva. Brez podatkov deluje v Bézierjevih lekcijah, funkcijah in geometriji krivulj, s tipkovnico pa s puščicami.',
        links: [
            {label: 'Trigonometrične funkcije', family: 'Funkcije', href: `${BASE}/functions/trigonometric?learn=1&ux=c15`,
                tryThis: 'V stavku »Pri privzetih nastavitvah A = 1, ω = 1 …« primi ω = 1 in vleci desno: val se stiska, sivi sinus je lekcija. Nato poskusi še φ in B.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c15`,
                tryThis: 'Na koncu odstavka primi t = 1/2 in ga vleci: celotna konstrukcija drsi po krivulji. Klikni Naprej in lekcija se vrne na t = 1/2.'},
            {label: 'Vzporedne krivulje', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/offset?learn=1&ux=c15`,
                tryThis: 'Primi razdaljo d v besedilu in jo vleci čez 0: vzporedna krivulja preskoči na drugo stran.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c15`,
                tryThis: 'Vleci a, b, c in d kar v besedilu prvega okvirja in opazuj, kateri premakne in kateri razteguje.'},
        ],
    },
    {
        id: 'c27',
        name: 'Megla',
        borrowed: 'megla vojne v strateških igrah, odkrit zemljevid v pustolovskih igrah in muzejska kartica z žigi',
        idea: 'Tir vsakega drsnika je na začetku šrafiran kot neraziskana pokrajina. Kjer je študent drsnik že povlekel, se megla razkadi in tir postane zelen; merilnik ob oznaki šteje raziskani delež, celoten razpon pa prinese kljukico »ves razpon«. Študent, ki parameter pusti na privzeti vrednosti ali ga le malo premakne, takoj vidi, kje še ni pogledal.',
        generalizes: 'Deluje na vsakem skupnem drsniku Slider v demonstracijah in lekcijah, brez podatkov. Študentovo vlečenje odkrije vso pot palca, skok (klik na tir ali korak lekcije) pa le eno mesto; raziskano ostane shranjeno tudi, ko lekcija drsnik na novem koraku prikaže znova.',
        links: [
            {label: 'Določeni integral', family: 'Funkcije', href: `${BASE}/functions/integral?ux=c27`,
                tryThis: 'Povleci n le malo: tir ostane večinoma šrafiran. Nato povleci mejo a čez cel tir in dobi »✓ ves razpon«; opazuj, kaj se zgodi s ploščino, ko je a večji od b.'},
            {label: 'Obodni kot in Talesov izrek', family: 'Geometrija ravnine', href: `${BASE}/inscribed-angle?ux=c27,c26`,
                tryThis: 'Lega točke P ima 360 stopinj neraziskane krožnice. Odpri še 〰️ Sled vlečenja in razišči cel tir: megla se razkadi, sled pa pokaže skok kota na nasprotnem loku.'},
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?learn=1&ux=c27`,
                tryThis: 'Pojdi skozi lekcijo: koraki premikajo drsnike, a odkrijejo le posamezna mesta. Ves razpon σ in μ moraš raziskati sam.'},
        ],
    },
    {
        id: 'c16',
        name: 'Kaj ostane enako?',
        borrowed: 'iskalnik izrekov v dinamični geometriji in Brilliantov trenutek »opaziš vzorec?«',
        idea: 'En pritisk in graf sam zaniha svoje vlečljive točke, medtem pa se za vsak par in trojico točk preverja, kaj drži: ali ležijo na premici, v kakšnem razmerju se delijo, ali so enako oddaljene od središča, ali je kot pravi. Števec odnosov pada v živo, kar preživi, se nariše na graf in pove z besedami: na Eulerjevi premici najde razmerje 2 : 1 in središče devetih točk, pri težišču tri težiščnice v razmerju 2 : 1.',
        generalizes: 'Uporablja le točke na tabli, krajišča narisanih daljic (tudi skrita, na primer razpolovišča) in presečišča narisanih premic. Ker aplikacija izpeljane elemente ob vsaki spremembi zgradi na novo, se točke prepoznajo po imenu in vrstnem redu, premik pa je pravi vlek JSXGraph, zato velja za vsako geometrijsko tablo brez podatkov.',
        links: [
            {label: 'Eulerjeva premica', family: 'Geometrija trikotnika', href: `${BASE}/euler-line?ux=c16`,
                tryThis: 'Pritisni Kaj ostane enako? in glej, kako števec pade s 64 na 8. Z › listaj: G deli HO v razmerju 2 : 1, N je razpolovišče HO, O je enako oddaljena od oglišč.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c16`,
                tryThis: 'Med lekcijo pritisni gumb: graf zaniha oglišča in najde, da G deli vse tri težiščnice v razmerju 2 : 1.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?ux=c16`,
                tryThis: 'Od 380 odnosov jih ostane 20: vse vmesne točke so razpolovišča, ker je t = 1/2. Nastavi t = 0,3 in poskusi znova.'},
            {label: 'Obodni kot', family: 'Geometrija krožnice', href: `${BASE}/inscribed-angle?ux=c16`,
                tryThis: 'Graf premika točke in ugotovi, katere ostanejo na krožnici s središčem O.'},
        ],
    },
    {
        id: 'c23',
        name: 'Moj zvezek',
        borrowed: 'šolski zvezek, Cornellove zapiske in laboratorijski dnevnik',
        idea: 'Med lekcijo se vsak okvir, do katerega pride študent, sam zapiše v zvezek: naslov, formule iz okvirja in graf, kot ga je pustil. Z 📌 Pripni doda svoj posnetek grafa s trenutnimi vrednostmi parametrov in ročno opombo, zvezek pa se odpre kot črtasta stran, ki se natisne ali shrani kot PDF za ponavljanje ali oddajo.',
        generalizes: 'Zvezek bere le skupni položaj lekcije, naslov in bloke z zapisom iz okvirja ter narisano tablo, zato deluje v vsaki vodeni lekciji brez podatkov; pripenjanje deluje tudi zunaj lekcij. Vse ostane v brskalniku, tiskanje uporablja tiskalni slog strani.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c23`,
                tryThis: 'Klikni nekajkrat Naprej, vmes 📌 Pripni, nato 📓 Zvezek: vsak okvir ima formulo in graf, v svoj posnetek pa vpiši opombo. Natisni ali shrani PDF.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c23`,
                tryThis: 'Pojdi skozi težišče, središče včrtane in višinsko točko: zvezek zbere vse štiri konstrukcije na eno stran.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c23`,
                tryThis: 'Na telefonu: pojdi do izračuna in odpri zvezek; točke P⁰, P¹, P² so zapisane ob sliki konstrukcije.'},
        ],
    },
    {
        id: 'c20',
        name: 'Ploščica XY',
        borrowed: 'ploščica XY na sintetizatorjih (Kaoss Pad) in zemljevid, po katerem premikaš žebljiček',
        idea: 'Dva parametra na eni ploščici: ko vlečeš piko, se oba drsnika premikata hkrati, zato raziskuješ ravnino grafov namesto dveh ločenih črt. Ozadje ploščice je zemljevid te ravnine, 4 × 4 sličice table za pare vrednosti, zato pika vedno stoji na majhni sliki tega, kar bo tabla pokazala, tvoja pot pa ostane na ploščici kot sled.',
        generalizes: 'Osi sta poljubna dva priključena drsnika iz skupnega Slider (v lekcijah tudi skrita), zamenjaš ju s čipoma. Sličice nariše aplikacija sama, vse v istem izrezu narisane vsebine, da se dajo primerjati. Deluje na vsaki tabli z vsaj dvema drsnikoma: funkcije, geometrija krivulj, verjetnost.',
        links: [
            {label: 'Parametrične krivulje (cikloida)', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/parametric?learn=1&ux=c20`,
                tryThis: 'Odpri Ploščico XY: zemljevid pokaže sled cikloide za vsak par t in polmera. Vleci piko desno in gor: krog se kotali in raste hkrati.'},
            {label: 'Trigonometrične funkcije', family: 'Funkcije', href: `${BASE}/functions/trigonometric?learn=1&ux=c20`,
                tryThis: 'Osi sta A in ω: v vrsticah se val stiska, v stolpcih raste in se pri negativnem A obrne. Zamenjaj navpično os na φ in poišči, kje se val ne premakne.'},
            {label: 'Gostota in verjetnost kot ploščina', family: 'Verjetnost', href: `${BASE}/probability/density?learn=1&ux=c20`,
                tryThis: 'Osi μ in σ: levo-desno se zvon premika, gor se splošči. Na telefonu se ploščica odpre kot list na dnu zaslona.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c20`,
                tryThis: 'Izberi c in d: pika na ploščici je kar teme parabole. Nato izberi a in b in poišči celico, kjer se graf zrcali.'},
        ],
    },
    {
        id: 'c19',
        name: 'Mreža primerov',
        borrowed: 'majhni mnogokratniki (»small multiples«) Edwarda Tufta in fotografski kontaktni list',
        idea: 'En pritisk nariše graf za šest vrednosti izbranega parametra hkrati, od najmanjše do največje, s trenutno vrednostjo označeno: vpliv parametra se vidi naenkrat, ne en položaj drsnika za drugim. Tapni sličico in drsnik skoči na to vrednost.',
        generalizes: 'Parametri so vsi priključeni drsniki iz skupnega Slider (v lekcijah tudi skriti), vsako sličico nariše aplikacija sama pri tisti vrednosti, nato se vrednost vrne. Deluje na vsaki tabli z drsnikom, brez podatkov.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c19`,
                tryThis: 'Mreža primerov za t: šest sličic konstrukcije od t = 0 do t = 1 kot stripa; točka na krivulji potuje.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c19`,
                tryThis: 'Izberi a: parabola se od −10 do 10 obrne in zoži. Nato izberi c ali d in primerjaj, kaj premakne graf.'},
            {label: 'Trigonometrične funkcije', family: 'Funkcije', href: `${BASE}/functions/trigonometric?ux=c19`,
                tryThis: 'Izberi ω: šest valov z vedno krajšo periodo. Pri A je pri A = 0 val raven, pri negativnem A obrnjen.'},
            {label: 'Vzporedne krivulje', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/offset?ux=c19`,
                tryThis: 'Mreža za razdaljo d pokaže, kdaj vzporedna krivulja dobi ostre konice.'},
        ],
    },
    {
        id: 'c22',
        name: 'Lupa',
        borrowed: 'lupa za besedilo na telefonu, urarska lupa in povečevalo v aplikacijah z zemljevidi',
        idea: 'Na zaslonu na dotik prst zakrije prav tisto točko, ki jo vleče. Med vlečenjem nad prstom (ali ob njem, ko zgoraj ni prostora) plava okrogla lupa z 2,4-kratno živo povečavo table, s križcem in koordinatami vlečene točke, zato je natančno postavljanje na telefonu končno mogoče.',
        generalizes: 'Lupa je živa kopija SVG table prek elementa use, zato prikaže vse, kar tabla nariše, brez kopiranja in v vsaki lekciji. Ali se kaj vleče, pove JSXGraph sam (način vlečenja), zato se lupa ne pokaže pri premikanju pogleda. Z miško jo vklopi gumb 🔍 Lupa ali tipka Alt med vlečenjem.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c22`,
                tryThis: 'Na telefonu povleci kontrolno točko: nad prstom se pokaže povečava s koordinatami, ki jih prst sicer zakrije.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?ux=c22`,
                tryThis: 'Povleci oglišče natanko na mrežno točko: lupa pokaže križec in koordinate, na računalniku vklopi 🔍 Lupa ali drži Alt.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c22`,
                tryThis: 'Povleci točko na paraboli ali parabolo samo: lupa sledi prstu in kaže, kje točno je.'},
        ],
    },
    {
        id: 'c4',
        name: 'Primi graf',
        borrowed: 'neposredno upravljanje iz Figme in inverzna kinematika iz igralnih pogonov in lutkovnih rigov',
        idea: 'Primi katerokoli krivuljo ali daljico na grafu in jo povleci: drsniki v orodjih se premaknejo sami, tako da gre graf skozi tvojo roko, ob roki pa se izpiše, kateri parametri delajo. Študent najprej pokaže obliko, ki jo želi, in iz tega razbere, kaj pomeni vsak parameter.',
        generalizes: 'Ob prijemu tabla vsak viden drsnik za hip rahlo premakne in izmeri, kam se premakne prijeti del grafa (numerični Jacobian); med vlečenjem dušeni najmanjši kvadrati razliko do roke prevedejo v spremembe drsnikov. Ne potrebuje nobene vednosti o grafu: deluje z vsakim skupnim drsnikom in vsako narisano krivuljo, drsniki brez učinka pa ostanejo pri miru.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c4`,
                tryThis: 'Primi zeleno parabolo (kazalec postane roka) in jo vleci gor, dol in vstran; opazuj, kateri od a, b, c, d se premikajo.'},
            {label: 'Vzporedne krivulje', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/offset?ux=c4`,
                tryThis: 'Primi črtkano vzporednico in jo odmakni od parabole: razdalja d sledi roki, tudi čez ničlo na drugo stran.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?ux=c4`,
                tryThis: 'Primi eno od oranžnih vmesnih daljic in jo potegni vzdolž kontrolnega poligona: parameter t gre za roko.'},
        ],
    },
    {
        id: 'c9',
        name: 'Preveri se',
        borrowed: 'priklic znanja iz Duolinga in Brilliant ter muzejski kviz, ki najprej vpraša in šele nato pove',
        idea: 'Vsak okvir lekcije iz lastnega besedila sestavi kratek preizkus na grafu: koordinata postane poved z luknjo, na primer »Teme je v ▢«, formula pa vprašanje »Tapni krivuljo y = (x − 3)² + 1«. Študent tapne na graf, tabla pokaže pravi odgovor, za koliko je zgrešil in zvezdice, odgovor v besedilu pa je med vprašanjem zabrisan.',
        generalizes: 'Vprašanja se ne pišejo: nastanejo iz TeX-a v trenutnem okvirju (isti razčlenjevalnik kot pri Živem besedilu), krivulje se preverijo numerično proti narisanim, poved z luknjo se izreže iz odstavka okoli formule. Gumb »Preveri se« se pokaže samo, ko okvir ima smiselna vprašanja (točka v pogledu, krivulja med vsaj dvema).',
        links: [
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c9`,
                tryThis: 'Klikni »Preveri se« zgoraj levo na grafu: najprej te vpraša po težišču G = ▢, ki ni na mreži, nato po ogliščih.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c9`,
                tryThis: 'Štirikrat klikni Naprej (okvir »Vodoravni prenos c«), nato »Preveri se«: katera parabola je y = (x − 3)² + 1, in kje je teme?'},
            {label: 'Bernsteinovi polinomi', family: 'Bézierjeve osnove', href: `${BASE}/bernstein?learn=1&ux=c9`,
                tryThis: 'Tapni krivuljo B₀¹(t) = 1 − t. Namerno tapni napačno premico in poglej, kako tabla pokaže razliko.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c9`,
                tryThis: 'Na telefonu: kartica se umakne na polovico table, kjer ni odgovora.'},
        ],
    },
    {
        id: 'c13',
        name: 'Ravnilo',
        borrowed: 'ravnilo in kotomer iz peresnice, merilo razdalj v Figmi in na zemljevidih',
        idea: 'Gumb Izmeri spremeni graf v merilno mizo: tapni do štiri točke in med njimi se napne ravnilo z dolžino in naklonom, v vsakem oglišču kotomer s kotom, med zaporednima daljicama pa razmerje. Točke se pripnejo na narisane točke, presečišča, vrhove in dna krivulj ter mrežo, točke na tabli pa vlečejo meritev s seboj, ko premikaš drsnik.',
        generalizes: 'Orodje bere le tablo: točke JSXGraph, vzorce vsake narisane krivulje (funkcijske grafe in osi natančno izračuna z bisekcijo, vrhe s parabolo skozi vzorce) in mrežo. Natančne vrednosti prepozna sámo (5/3, π, √10), zato študent preveri trditve lekcij, kot sta 2 : 1 ali t : (1 − t), brez avtorskih podatkov.',
        links: [
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c13`,
                tryThis: 'Izmeri, tapni P₃, nato G in na koncu presečišče težiščnice s stranico: razmerje je 2 : 1 in kot 180° pove, da je G na težiščnici. Povleci oglišče in razmerje ostane 2 : 1.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?ux=c13`,
                tryThis: 'Tapni p₀⁰, p₀¹ in p₁⁰: razmerje je 1 : 1. Nato v orodjih nastavi t = 0,3 in meritev se premakne s točkami: 3 : 7.'},
            {label: 'Trigonometrične funkcije', family: 'Funkcije', href: `${BASE}/functions/trigonometric?ux=c13`,
                tryThis: 'Tapni dve zaporedni ničli sinusa: razdalja je π. Tapni vrh: točka se pripne na (π/2; 1). Spremeni ω in izmeri periodo znova.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c13`,
                tryThis: 'Tapni teme parabole in izhodišče: teme se pripne natanko na (3; 1), razdalja je √10, naklon 1/3.'},
        ],
    },
    {
        id: 'c14',
        name: 'Kaj če?',
        borrowed: 'peskovnik ob ravni v igrah, »poskusni posnetek« v glasbenih programih in veja v Gitu',
        idea: 'V vsakem okvirju lekcije lahko študent stopi s poti: parametri okvirja, ki jih lekcija sicer skrije z orodji, pridejo na graf kot žetoni z drsnikom, točke na grafu postanejo vlečljive, slika lekcije pa ostane zadaj kot bled duh za primerjavo. Gumb Nazaj k lekciji vse gladko vrne, premik naprej v lekciji pa najprej obnovi stanje lekcije, zato raziskovanje lekcije nikoli ne pokvari.',
        generalizes: 'Žetoni so vsi priključeni drsniki iz skupnega Slider (tudi skriti), točke so vse vlečljive točke JSXGraph, duh je kopija SVG table v trenutku razcepa, vračanje pa gre skozi iste vmesnike kot študentova roka (drsnik in pravi vlek točke), zato stanje aplikacije sledi. Lekcija ne potrebuje nobenih podatkov.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c14`,
                tryThis: 'Dvakrat klikni Naprej, nato Kaj če?, izberi a in ga povleci v negativno: parabola se obrne, bledi duh pokaže lekcijo. Klikni Naprej in lekcija se nadaljuje, kot da se ni nič zgodilo.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c14`,
                tryThis: 'Kaj če? in povleci oglišče: težiščnice in G sledijo, sivi trikotnik je lekcija. Nazaj k lekciji odpelje oglišče nazaj.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c14`,
                tryThis: 'Kaj če?, žeton t: povleci t proti 1 in primerjaj konstrukcijo z duhom pri t = 1/2. Oznaka ▲ lekcija kaže, od kod si prišel.'},
        ],
    },
    {
        id: 'c3',
        name: 'Napovej',
        borrowed: 'muzejski eksponati »najprej ugani, nato poglej« in zanka ugibanja v igrah',
        idea: 'Preden korak lekcije spremeni graf, se tabla zamrzne na stari sliki in študent s prstom ali miško nariše, kar pričakuje. Razkritje stari sliki pusti zbledeti pod skico, obarva, kar se je res spremenilo, in skico oceni z zvezdicami.',
        generalizes: 'Napoved se sproži sama: ob vsakem koraku naprej primerja narisane oblike pred in po prizoru (pogled mora ostati isti, prestavljeni a nespremenjeni predmeti ne štejejo). Lekcije ne potrebujejo nobenih oznak; koraki brez vidne spremembe tečejo naprej kot doslej.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c3`,
                tryThis: 'Dvakrat Naprej: preden se graf premakne za d navzgor, nariši novo parabolo in pritisni Razkrij.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c3`,
                tryThis: 'Enkrat Naprej: nariši, kje bodo simetrale stranic in očrtana krožnica.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c3`,
                tryThis: 'Prva napoved pride v 4. koraku, ko kvadratna krivulja postane kubična: nariši novo krivuljo.'},
        ],
    },
    {
        id: 'c10',
        name: 'Filmski trak',
        borrowed: 'filmski trak iz programov za montažo videa in risanka na listih (flipbook)',
        idea: 'Ob spodnjem robu grafa je trak vseh okvirjev lekcije; vsak okvir, ki ga je študent že videl, hrani sliko table. Vlečenje po traku lista po teh slikah kot po risanki, zato se konstrukcija pred očmi gradi in podira v poljubnem tempu, ob spustu pa lekcija skoči na izbrani okvir.',
        generalizes: 'Slike so kopije narisane table (SVG in oznake), skok pa izvede običajni Naprej oziroma Nazaj seje lekcije, zato se vsa dejanja scene izvedejo kot sicer. Deluje v vsaki vodeni lekciji brez dodatnih podatkov; trak se prilagodi številu okvirjev in širini table, tudi na telefonu.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c10`,
                tryThis: 'Klikaj Naprej do koraka 4, nato vleci po traku nazaj in naprej: parabola se premika, razteza in zrcali kot v risanki.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c10`,
                tryThis: 'Pojdi nekaj okvirjev naprej in z drsenjem po traku primerjaj vrstice konstrukcije; spusti na prvem okvirju za skok nazaj.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c10`,
                tryThis: 'Po štirih korakih (težišče, središče očrtane krožnice, …) drsi po traku in opazuj, kako se znamenite točke selijo po trikotniku.'},
        ],
    },
    {
        id: 'c11',
        name: 'Duh pokaže',
        borrowed: 'prozorna roka iz vadnic v igrah in muzejskih kioskov na dotik',
        idea: 'Ko okvir lekcije zahteva raziskovanje in se nekaj sekund nič ne zgodi, v graf seže prosojna roka, prime točko, jo zavrti v majhni zanki in jo vrne na mesto, nato pa še premakne drsnik. Študent vidi, kaj se da premikati in kaj se ob tem spremeni, še preden kaj prebere; gumb ✋ Pokaži prikaz ponovi kjerkoli.',
        generalizes: 'Roka ne pozna nobene lekcije: poišče vlečljive točke JSXGraph (najbližjo sredini table) in vidne skupne drsnike, točko pa premika z navadnimi dogodki kazalca, zato konstrukcija sledi tako kot pri pravem vlečenju in se na koncu natančno vrne. Pravi pritisk prikaz takoj ustavi.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c11`,
                tryThis: 'Klikni Naprej na okvir »Opazovanje« in počakaj tri sekunde: roka prime kontrolno točko in konstrukcija sledi.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c11`,
                tryThis: 'Klikni ✋ Pokaži zgoraj levo: roka premakne označeno točko na paraboli, nato drsnik c v orodjih.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?ux=c11`,
                tryThis: 'Na telefonu klikni ✋ Pokaži: roka povleče oglišče in težišče se premika z njim.'},
        ],
    },
    {
        id: 'c12',
        name: 'Bralni vodič',
        borrowed: 'muzejski avdiovodič in karaoke',
        idea: 'Gumb ▶ Preberi z grafom v okvirju lekcije vodi branje: poved za povedjo se osvetli v besedilu, formula v njej se obkroži, tabla pa hkrati pokaže, o čem govori (žebljiček, krivulja, točka). Tempo sledi dolžini povedi; vsak dotik branje ustavi, tako da lahko študent kadarkoli prevzame.',
        generalizes: 'Povedi se razrežejo iz besedila okvirja z razponi DOM (označevanje s CSS Custom Highlight, brez spreminjanja besedila), povezave na tablo pa so iste kot pri Živem besedilu. Na telefonu tablo pokaže plavajoče okno. Deluje v vsakem okvirju z matematiko v besedilu.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c12`,
                tryThis: 'Klikni ▶ Preberi z grafom nad besedilom in samo glej: kontrolne točke se prižgejo po vrsti, ko jih besedilo omeni.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c12`,
                tryThis: 'Štirikrat klikni Naprej in nato ▶: besedilo o vodoravnem premiku pokaže parabolo, teme in sliko točke.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c12`,
                tryThis: 'Klikni ▶: oglišča A, B, C in težišče G se prižigajo hkrati z branjem.'},
        ],
    },
    {
        id: 'c18',
        name: 'Previj nazaj',
        borrowed: 'previjanje časa iz igre Braid, zgodovina razveljavitev v glasbenih programih in drsnik videa',
        idea: 'Vse, kar študent na grafu naredi, vlek točk in premik drsnikov, se snema kot časovni trak pod grafom, z oznako na začetku vsake kretnje. Z vlekom po traku se graf odvrti nazaj skozi lastno raziskovanje, Ctrl+Z in Ctrl+Y pa korakata po eno kretnjo.',
        generalizes: 'Snema vse priključene drsnike iz skupnega Slider in vse vlečljive točke JSXGraph, predvaja pa skozi iste vmesnike kot roka (vrednost drsnika in pravi vlek točke), zato stanje aplikacije sledi. Ni podatkov na lekcijo.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c18`,
                tryThis: 'Premakni nekaj drsnikov, nato povleci po traku pod grafom nazaj: parabola se vrne po isti poti. Ctrl+Z razveljavi eno kretnjo.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?ux=c18`,
                tryThis: 'Povleci oglišča v nekaj različnih trikotnikov, nato s trakom poišči tistega, pri katerem je bil H zunaj trikotnika.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?ux=c18`,
                tryThis: 'Premakni kontrolne točke in t, nato previj in primerjaj obliko krivulje pred spremembo in po njej.'},
        ],
    },
    {
        id: 'c17',
        name: 'Kazalnik',
        borrowed: 'laserski kazalnik predavatelja, črnilo, ki izgine, iz programov za prosojnice, in reflektor vodiča po muzeju',
        idea: 'Za pouk s projektorjem: kazalec na grafu postane žareča točka s kratkim repom, z vlekom pišeš črnilo, ki čez nekaj sekund samo zbledi, reflektor pa zatemni vse razen okolice kazalca. Dvojni dotik izbriše črnilo, tipka L vklopi kazalnik, S reflektor.',
        generalizes: 'Je le prozorna plast nad tablo, zato ne spremeni grafa in ne potrebuje ničesar od lekcije: deluje na vsaki tabli, v demonstraciji, v lekciji in v predstavitvenem načinu.',
        links: [
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c17`,
                tryThis: 'Vklopi Kazalnik, obkroži težišče G in opazuj, kako krog zbledi. Nato izberi Reflektor in z njim vodi pogled po težiščnicah.'},
            {label: 'Trigonometrične funkcije', family: 'Funkcije', href: `${BASE}/functions/trigonometric?ux=c17`,
                tryThis: 'Pritisni L in s kazalnikom pokaži periodo, nato s črnilom označi ničle.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c17`,
                tryThis: 'Reflektor (S) osvetli le eno vrstico konstrukcije, ko jo razlagaš razredu.'},
        ],
    },
    {
        id: 'c5',
        name: 'Ujemi',
        borrowed: 'igre ujemanja grafov (Desmos Marbleslides) in arkadni krogi »zadeni obliko«',
        idea: 'Gumb Izziv spremeni trenutni graf v zlato tarčo in premeša nekaj drsnikov, ki ga res oblikujejo. Študent z drsniki, tipkanjem, nihalom ali prijemom grafa najde pot nazaj; merilnik kaže ujemanje v živo, zadetek prinese zvezdice, vsak naslednji krog pa premeša en drsnik več.',
        generalizes: 'Tarča je kar trenutna slika table, premešajo se le drsniki, ki sliko vidno spremenijo, in le tako, da premešana slika ostane na tabli. Tako iz vsakega grafa z drsniki (tudi sredi lekcije, v okvirju Opazovanje) brez priprave nastane uganka.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c5,c4`,
                tryThis: 'Pritisni Izziv (desno zgoraj na grafu) in spravi parabolo nazaj na tarčo; poskusi tudi s prijemom grafa (c4 je vklopljen).'},
            {label: 'De Casteljau, opazovanje', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c5`,
                tryThis: '4 × Naprej do opazovanja, nato Izziv: poišči t, pri katerem vmesna daljica pade na zlato tarčo.'},
            {label: 'Vzporedne krivulje', family: 'Geometrija krivulj', href: `${BASE}/curve-geometry/offset?ux=c5`,
                tryThis: 'Izziv premakne vzporednico; vrni jo na tarčo. Drugi krog premeša že dva drsnika.'},
        ],
    },
    {
        id: 'c1,c2',
        name: 'Dolga osvetlitev + Nihalo',
        borrowed: 'fotografija z dolgo osvetlitvijo, »onion skin« iz animacije in LFO iz sintetizatorja',
        idea: 'Graf si zapomni vsako lego, skozi katero gre: bledeča sled pokaže, od kod se je nekaj premaknilo, odprta zaslonka pa nabere celo družino krivulj, ogrinjače in tire točk. Vsak drsnik dobi gumb ∿, ki parameter sam zaniha po celem razponu (še en pritisk: hitreje), zato lahko študent opazuje, namesto da vleče.',
        generalizes: 'Osvetlitev bere samo narisane oblike na tabli JSXGraph, zato deluje na vsakem grafu, tudi na tistih, ki konstrukcijo ob vsaki spremembi zgradijo na novo. Nihalo je del skupnega drsnika, ki ga uporablja 92 datotek.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?learn=1&ux=c1,c2`,
                tryThis: 'Pojdi do prvega opazovanja (4 × Naprej), izberi Osvetlitev in pritisni Predvajaj: vmesna daljica nariše krivuljo kot svojo ogrinjačo.'},
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?ux=c1,c2`,
                tryThis: 'Izberi Osvetlitev, nato pri »Vodoravni premik c« pritisni ∿, pri »Navpična raztegnitev a« pa dvakrat ∿.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?ux=c1,c2`,
                tryThis: 'Izberi Osvetlitev in vleci oglišče v krogu: težišče in višinska točka narišeta vsak svoj tir.'},
        ],
    },
    {
        id: 'c6',
        name: 'Poslušaj',
        borrowed: 'glasbila in zvočni grafi za slepe in slabovidne (zvočna sled v Desmosu)',
        idea: 'Gumb Poslušaj pošlje čez tablo predvajalno glavo, vsaka krivulja pa poje svojo višino: višje na tabli zveni višje, zvok potuje od levega do desnega zvočnika, prehod čez os x klikne, vrzel v krivulji je tišina. Simetrija, periodičnost, rast in ničle postanejo slišne; z nihalom (c2) na drsniku se graf igra kot theremin.',
        generalizes: 'Bere le narisane krivulje na tabli (do štiri glasove), zato deluje na vsakem grafu funkcije, porazdelitve ali baznih funkcij brez priprave; je tudi zametek dostopnosti za študente, ki grafa ne vidijo.',
        links: [
            {label: 'Trigonometrične funkcije', family: 'Funkcije', href: `${BASE}/functions/trigonometric?ux=c6,c2`,
                tryThis: 'Pritisni Poslušaj; nato pri Frekvenci ω pritisni ∿ in poslušaj znova: valovanje se zgosti.'},
            {label: 'Bernsteinovi polinomi', family: 'Bézierjeve osnove', href: `${BASE}/bernstein?learn=1&ux=c6`,
                tryThis: 'V opazovanju pritisni Poslušaj: bazni funkciji se zrcalno zamenjata, njuna glasova se prekrižata.'},
            {label: 'Gostota porazdelitve', family: 'Verjetnost', href: `${BASE}/probability/density?ux=c6`,
                tryThis: 'Poslušaj zvonasto krivuljo: ton se dvigne do vrha in simetrično spusti.'},
        ],
    },
    {
        id: 'c7',
        name: 'A/B: zavesa in utripanje',
        borrowed: 'primerjava A/B v glasbenih studiih, zavesa »prej/potem« in astronomski primerjalnik z utripanjem, s katerim so odkrili Pluton',
        idea: 'Z »Zapomni si A« si tabla zapomni sliko; nato spremeniš karkoli (drsnik, točko, korak lekcije) in primerjaš: zavesa levo kaže A, desno zdaj, utripanje pa izmenjuje obe sliki, da sprememba skoči v oči.',
        generalizes: 'A je kopija narisane table z oznakami vred, zato primerjava deluje na vsakem grafu in tudi med koraki lekcije, brez ene vrstice kode v lekcijah.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Funkcije', href: `${BASE}/functions/transformations?learn=1&ux=c7`,
                tryThis: 'Zapomni si A, nato dvakrat Naprej in izberi Zavesa: vleci ločnico čez parabolo, prej/potem se zlijeta v en sam rez.'},
            {label: 'Znamenite točke trikotnika', family: 'Geometrija trikotnika', href: `${BASE}/triangle-centres?learn=1&ux=c7`,
                tryThis: 'Zapomni si A, pojdi korak naprej in izberi Utripaj: nove simetrale in krožnica utripajo, vse drugo miruje.'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', href: `${BASE}/bezier/decasteljau?ux=c7`,
                tryThis: 'Zapomni si A, premakni eno kontrolno točko in izberi Zavesa: vidiš, kateri del krivulje se je premaknil in kateri ne.'},
        ],
    },
];

export function UxLab() {
    useEffect(() => { document.title = 'UX laboratorij · Bezeg'; }, []);
    return <main className="ux-lab" data-content-column>
        <header className="ux-lab-intro">
            <p className="ux-lab-kicker">Izziv UX · pas C</p>
            <h1>Laboratorij prototipov</h1>
            <p>Mehanike, izposojene iz iger, glasbil, ustvarjalnih orodij in muzejskih eksponatov, v službi matematike. Vsak prototip se vklopi z zastavico <code>?ux=</code> v naslovu; povezava »Brez« odpre isto stran v današnji obliki. V vogalu strani je oznaka z gumbom za izklop.</p>
            <div className="ux-lab-all">
                <a className="ux-lab-open" href={`${BASE}/functions/transformations?ux=c1,c2,c4,c5,c6,c7,c8,c11,c13,c16,c17,c18,c19,c20,c22,c23,c26,c27`}><span>Igrišče: vsa orodja za graf</span><small>Premiki in raztegi grafa</small></a>
                <a className="ux-lab-open ux-lab-open-alt" href={`${BASE}/bezier/decasteljau?learn=1&ux=c3,c8,c9,c10,c11,c12,c14,c15,c19,c21,c23,c28`}><span>Lekcija: vsi lekcijski prototipi</span><small>De Casteljau</small></a>
            </div>
        </header>
        <ol className="ux-lab-list">
            {PROTOTYPES.map((prototype, index) => <li key={prototype.id} className="ux-lab-card">
                <div className="ux-lab-card-head">
                    <span className="ux-lab-rank" aria-hidden="true">{index + 1}</span>
                    <div>
                        <h2>{prototype.name}</h2>
                        <p className="ux-lab-flag"><code>?ux={prototype.id}</code> · izposojeno iz: {prototype.borrowed}</p>
                    </div>
                </div>
                <p>{prototype.idea}</p>
                <p className="ux-lab-general"><strong>Zakaj velja splošno.</strong> {prototype.generalizes}</p>
                <ul className="ux-lab-links">
                    {prototype.links.map(link => {
                        const off = link.href.replace(/([?&])ux=[^&]*/, '$1ux=off');
                        return <li key={link.href}>
                            <div className="ux-lab-link-row">
                                <a className="ux-lab-open" href={link.href}><span>{link.label}</span><small>{link.family}</small></a>
                                <a className="ux-lab-off" href={off}>Brez</a>
                            </div>
                            <p>{link.tryThis}</p>
                        </li>;
                    })}
                </ul>
            </li>)}
        </ol>
    </main>;
}
