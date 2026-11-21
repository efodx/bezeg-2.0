import React from 'react';
import './UxLab.css';

/** The lane-A tour: one card per prototype, best first, with deep links that switch the flags on. */

interface LabLink { label: string; family: string; path: string; at?: number; flags: string; free?: boolean }
interface LabPrototype { id: string; name: string; idea: string; general: string; try: string; links: LabLink[] }

const PROTOTYPES: LabPrototype[] = [
    {
        id: 'a13', name: 'Lestvica abstrakcije',
        idea: 'En pritisk in graf stopi korak nazaj: živa tabla se pomanjša v eno sličico mreže, okrog nje pa se prikaže isti graf pri drugih vrednostih parametra — barvno, kar se spreminja, bledo, kar ostane. Tapni drugi simbol in mreža postane ravnina dveh parametrov (k in p pri binomski porazdelitvi), tapni sličico in se ta razraste v tablo, graf pa zdrsne tja.',
        general: 'Sličice so prava tabla pri teh vrednostih: Bezeg jih nastavi sinhrono prek deljenega registra drsnikov, posname SVG in vrne stanje. Okno vrednosti se samo zoži, dokler večina sličic kaže nekaj, kar se premika, korak pa je lepo število z živo vrednostjo v mreži. Brez kode lekcij deluje v šolskih funkcijah, verjetnosti, trigonometriji, analizi, Bézierjevih krivuljah, B-zlepkih in kompleksnih številih.',
        try: 'Pritisni »Lestvica« desno spodaj. Nato tapni še en simbol v glavi za ravnino parametrov in tapni sličico, da graf skoči tja.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 2, flags: 'a13'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', at: 1, flags: 'a13'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', at: 1, flags: 'a13'},
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', flags: 'a13', free: true},
        ],
    },
    {
        id: 'a12', name: 'Zgodba lekcije',
        idea: 'Pod grafom vsak okvir lekcije, ki ga učenec vidi, pusti sličico table in to, kar je korak spremenil (»d 0 → 1«), kot sličice stripa. Pokaži na sličico in tisti trenutek se kot bleda senca položi čez živi graf (kako je bilo dva koraka nazaj?); tapni jo in lekcija se vrne tja. Na koncu lekcije je trak povzetek celotne poti.',
        general: 'Sličice so kloni SVG-ja table, okvir prebere iz vrstice napredka na kartici lekcije, spremembe iz deljenega registra drsnikov, skok pa pritiska kartičina gumba Nazaj in Naprej. Nobena lekcija za to ne potrebuje metapodatkov.',
        try: 'Pojdi skozi nekaj okvirov, nato pokaži na starejšo sličico (senca na grafu) in jo tapni.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a6,a12'},
            {label: 'De Boorov algoritem', family: 'B-zlepki', path: 'bspline/deboor', flags: 'a6,a12'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a6,a12'},
        ],
    },
    {
        id: 'a11', name: 'Nariši in najdi',
        idea: 'Z eno potezo nariši krivuljo na graf in Bezeg poišče parametre, pri katerih gre graf skozi tvojo skico — nato krivulja iz prejšnjega položaja zdrsne vanjo in kartica pove »tvoja skica: c ≈ 1, d ≈ −3, a ≈ 2«. Obratno vprašanje vsake lekcije o grafih (katera števila dajo to obliko?) postane gib roke; ko dva parametra delujeta enako (a in b pri paraboli), to tudi pove.',
        general: 'Reševalec ne pozna grafa: s kratkim sunkom ugotovi, katere krivulje premika kateri parameter, nato minimizira obojestransko razdaljo med skico in krivuljo (Levenberg–Marquardt s končnimi razlikami prek prave table, več začetnih točk, tudi zrcaljenja predznaka). Deluje na vsakem grafu s krivuljo in drsniki: parabola, sinusoida, binomska porazdelitev.',
        try: 'Pritisni »Nariši in najdi« desno spodaj, nariši obliko z eno potezo in počakaj nekaj sekund. Pri binomski porazdelitvi nariši zvonec — Bezeg najde p.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a11', free: true},
            {label: 'Trigonometrične funkcije', family: 'Trigonometrija', path: 'functions/trigonometric', flags: 'a11', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a11', free: true},
        ],
    },
    {
        id: 'a10', name: 'Zadeni graf',
        idea: 'Vsak graf postane igra: na tabli se pojavi črtkana tarča — isti graf pri skritih vrednostih — in učenec svoj graf pripelje nanjo s ploščicami, z drsniki ali tako, da prime krivuljo (a4). Prva kroga povesta, kateri parameter se je spremenil; potem mora učenec to razbrati sam iz oblike (ožja parabola — torej a), nato pa ugane dva ali tri hkrati, z nizi zadetkov in točkami.',
        general: 'Tarče so naključne lepe vrednosti parametrov iz deljenega registra; tarča, ki bi zbežala s table, se zavrže, parametri, ki premaknejo le napis, se izločijo. Igra ne potrebuje nobene vrstice kode posameznega grafa in deluje na vsakem grafu z drsnikom.',
        try: 'Pritisni »Zadeni graf« desno spodaj na grafu. Spusti ploščico, ko se graf pokrije s tarčo; tarča se med približevanjem obarva zeleno.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a1,a4,a10', free: true},
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', flags: 'a1,a10', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a1,a10', free: true},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a1,a10', free: true},
        ],
    },
    {
        id: 'a9', name: 'Živo besedilo',
        idea: 'Simbol v besedilu lekcije, ki je parameter grafa (d v »Navpični premik d«, θ v formuli), postane ročica. Pokaži nanj in na grafu zasvetijo deli, ki jih premika, ter oznake in ploščica, ki so od njega odvisne; povleci ga vstran in parameter mu sledi. Med razlago je simbol vzmet: spusti ga in vrednost se vrne na lekcijino.',
        general: 'Kateri znak je kateri, pove MathJaxov lastni MathML, kateri znaki so parametri, pove deljeni register drsnikov, kaj parameter premika, pa kratek poskus na tabli (3-odstotni sunek za dve sličici). Nič od tega ne potrebuje kode lekcije: deluje v šolskih funkcijah, trigonometriji, B-zlepkih, verjetnosti, analizi in geometriji krivulj.',
        try: 'Pokaži na podčrtani d v naslovu okvirja in opazuj graf, nato ga povleci levo ali desno in spusti. Pri binomski porazdelitvi povleci k ali n kar iz formule.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 2, flags: 'a1,a9'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', at: 2, flags: 'a1,a9'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', at: 1, flags: 'a1,a9'},
            {label: 'Ukrivljenost', family: 'Geometrija krivulj', path: 'curve-geometry/curvature', at: 1, flags: 'a1,a9'},
        ],
    },
    {
        id: 'a8', name: 'Ti na vrsti',
        idea: 'Ko korak lekcije premakne graf, se na tabli ponudi »Ti na vrsti«: sprememba se previje nazaj, novo stanje ostane kot črtkana slika, učenec pa ga sestavi sam — samo s parametri, ki jih je korak spremenil. Črtkana slika se med približevanjem obarva iz okraste v zeleno, zadetek pa vzcveti v bezgove cvetove.',
        general: 'Kaj je korak spremenil, ve deljeni register drsnikov (vrednost pred klikom in po njem), ciljno sliko pa da izris table: klon vsakega elementa, ki se ob previjanju premakne. Brez metapodatkov lekcije deluje povsod, kjer korak spremeni parameter — preizkušeno na 8 lekcijah iz 7 družin.',
        try: 'Pritisni »Naprej«, nato »Ti na vrsti«. Povleci ploščico do črtkane slike in spusti (ali uporabi puščice); »Pokaži« pokaže pot.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 5, flags: 'a1,a6,a8'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', at: 7, flags: 'a1,a6,a8'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', at: 1, flags: 'a1,a6,a8'},
            {label: 'De Boorov algoritem', family: 'B-zlepki', path: 'bspline/deboor', at: 1, flags: 'a1,a6,a8'},
        ],
    },
    {
        id: 'a4', name: 'Zgrabi krivuljo',
        idea: 'Primi kar krivuljo, premico ali izpeljano točko in jo povleci: parametri se spremenijo tako, da gre krivulja skozi tvoj prst. Tapni krivuljo, da zabiješ žebljiček; ta drži svojo točko, zato vlečenje drugje spremeni druge parametre (oglišče pribiješ, krak potegneš — parabola se raztegne).',
        general: 'Reševalec ne ve nič o grafu: ob prijemu vsak parameter rahlo potrese, izmeri, kako se prijeto mesto premakne, nato vsako sličico reši dušeni problem najmanjših kvadratov in sproti popravlja oceno (Broyden). Brez žebljičkov vleče en parameter naenkrat — tistega, ki prijeto mesto premakne najbolj — in svetleča ploščica pove, katerega.',
        try: 'Pri Taylorju povleci tangento in opazuj, kako središče c drsi po krivulji. Pri paraboli tapni oglišče, nato povleci krak.',
        links: [
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', at: 2, flags: 'a1,a4'},
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 1, flags: 'a1,a4'},
            {label: 'Množenje kompleksnih števil', family: 'Kompleksna števila', path: 'complex-multiplication', at: 1, flags: 'a1,a4'},
        ],
    },
    {
        id: 'a5', name: 'Najprej napovej',
        idea: 'S svinčnikom nariši na graf, kam misliš, da bo šla krivulja, nato napoved zakleni in spremeni graf ali pojdi naprej. Ko se graf umiri, ostane tvoja napoved na njem — zelena, kjer se ujema, oranžna pikčasta, kjer se ne — z oceno zadetka.',
        general: 'Primerjava ne pozna lekcije: napoved primerja z vsemi elementi table, ki so se po zaklepu premaknili ali pojavili. Ko besedilo okvirja reče »napovej«, »predvidi« ali »ugani«, svinčnik sam povabi k risanju — brez metapodatkov lekcije.',
        try: 'Pri Taylorju (okvir prosi za napoved) nariši, kje bo tangenta, zakleni in povleci ploščico c. Pri Bézierju nariši obliko, zakleni in pritisni Naprej.',
        links: [
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', at: 2, flags: 'a1,a5'},
            {label: 'Bézierjeva krivulja', family: 'Bézierjeve krivulje', path: 'bezier/curve', at: 2, flags: 'a5'},
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 1, flags: 'a1,a5'},
        ],
    },
    {
        id: 'a6', name: 'Koraki, ki se premaknejo',
        idea: 'Ko lekcija ob »Naprej« spremeni parameter, ta ne skoči, ampak v manj kot sekundi odpotuje do nove vrednosti. Učenec vidi, kaj je korak spremenil in kako — z dolgo osvetlitvijo (a2) gib pusti sled, na primer zrcaljenje parabole čez premico y = d.',
        general: 'Prehod ujame vsako spremembo parametra v deljenem registru drsnikov, ki sledi kliku na gumb lekcije; lekcije zanj ne vedo ničesar. Celoštevilski parametri stopajo po celih številih, učenčev dotik prehod takoj zaključi.',
        try: 'Pritiskaj »Naprej« in opazuj graf; primerjaj s povezavo »brez«.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a1,a2,a6'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a1,a2,a6'},
            {label: 'De Boorov algoritem', family: 'B-zlepki', path: 'bspline/deboor', flags: 'a1,a2,a6'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a1,a6'},
        ],
    },
    {
        id: 'a7', name: 'Poslušaj krivuljo',
        idea: 'Predvajalna črta potuje čez graf in vsaka vidna krivulja zapoje: višina tona je višina krivulje, ničla klikne, presečišče dveh krivulj zazvoni. Črto lahko primeš in z njo drsiš, med predvajanjem pa vlečeš ploščice ali pustiš parametre nihati in slišiš spremembo.',
        general: 'Bere JSXGraphove vzorčene krivulje kateregakoli grafa, zato poje vsak graf funkcije ali parametrična krivulja. Hkrati je zvočni dostop do grafa za slepe in slabovidne učence.',
        try: 'Vklopi zvok (slušalke!), nato pri Taylorju povleci ploščico c ali pritisni + pri stopnji.',
        links: [
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', at: 2, flags: 'a1,a7'},
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 1, flags: 'a1,a3,a7'},
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', at: 1, flags: 'a1,a7'},
        ],
    },
    {
        id: 'a1', name: 'Parametri pod prsti',
        idea: 'Vsak parameter grafa je ploščica na samem grafu: povleci jo levo ali desno in graf se odziva, ne da bi pogled zapustil krivuljo. Dvigni prst nad ploščico za fino nastavljanje (merilo se poveča), lepe vrednosti pa se ujamejo z rahlim klikom.',
        general: 'Ploščice nastanejo iz deljenega drsnika (88 klicnih mest), zato jih dobi vsak graf in vsaka lekcija brez lastne kode. Ko lekcija sama spremeni parameter, ploščica zažari, tako da učenec vidi, kaj je korak spremenil.',
        try: 'Povleci ploščico vodoravno; med vlečenjem dvigni prst ali miško navzgor. Kolešček in puščice tudi delujejo. Dvoklik vrne začetno vrednost.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 1, flags: 'a1'},
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', at: 2, flags: 'a1'},
            {label: 'De Boorov algoritem', family: 'B-zlepki', path: 'bspline/deboor', at: 1, flags: 'a1'},
            {label: 'Množenje kompleksnih števil', family: 'Kompleksna števila', path: 'complex-multiplication', at: 1, flags: 'a1'},
        ],
    },
    {
        id: 'a2', name: 'Dolga osvetlitev',
        idea: 'Dokler je roka na matematiki, vsak premikajoči se element pušča bledečo sled. Poteg parametra tako nariše celo družino krivulj, vlečena točka svojo pot, premikajoča se premica pa ovojnico.',
        general: 'Deluje na kateri koli JSXGraph tabli: opazuje izrisane elemente in klonira tiste, ki so se premaknili. Gumb »Dolga osvetlitev« sled zadrži, da lahko nastalo sliko pokažeš razredu.',
        try: 'Povleci točko ali ploščico parametra in opazuj sled. Pri De Casteljauju nastane ovojnica vmesnih daljic.',
        links: [
            {label: 'De Casteljau', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', at: 1, flags: 'a1,a2'},
            {label: 'Reševanje trikotnika', family: 'Trigonometrija', path: 'triangle-solver', at: 1, flags: 'a2'},
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 1, flags: 'a1,a2'},
        ],
    },
    {
        id: 'a3', name: 'Dihajoči parametri',
        idea: 'Gumb ∿ na ploščici zaniha parameter med mejama, več parametrov pa lahko niha hkrati z različnimi periodami. Graf postane živ in učenec opazuje, kaj se ohranja, medtem ko se vse drugo spreminja.',
        general: 'Nihalo uporablja isti register parametrov kot ploščice, zato deluje povsod, kjer je drsnik. Z dolgo osvetlitvijo (a2) nihanje izriše celotno družino.',
        try: 'Pritisni ∿ na eni ali dveh ploščicah in vklopi »Dolga osvetlitev«.',
        links: [
            {label: 'Binomska in normalna porazdelitev', family: 'Verjetnost', path: 'probability/binomial-normal', at: 1, flags: 'a1,a2,a3'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', at: 1, flags: 'a1,a2,a3'},
            {label: 'Ukrivljenost', family: 'Geometrija krivulj', path: 'curve-geometry/curvature', at: 1, flags: 'a1,a2,a3'},
        ],
    },
];

/** Best first. */
const ORDER = ['a8', 'a11', 'a13', 'a9', 'a4', 'a10', 'a12', 'a1', 'a6', 'a5', 'a2', 'a7', 'a3'];
const rank = (id: string) => { const i = ORDER.indexOf(id); return i < 0 ? ORDER.length : i; };

function href(link: LabLink, flags: string | undefined) {
    const query = new URLSearchParams(link.free ? {} : {learn: '1'});
    if (link.at) query.set('uxAt', String(link.at));
    if (flags) query.set('ux', flags);
    return `/bezeg-2.0/${link.path}?${query.toString()}`;
}

export function UxLab() {
    return <div className="ux-lab-wrap"><main className="ux-lab">
        <header className="ux-lab-header">
            <p className="ux-lab-eyebrow">Laboratorij UX · proga A</p>
            <h1>Matematika pod prsti</h1>
            <p className="ux-lab-lede">Prototipi, v katerih graf sam postane krmilo: vlečeš, drsiš, nihaš in opazuješ sled. Vsak je vklopljen z zastavico <code>?ux=</code>; povezava »brez« odpre isti okvir lekcije v današnji aplikaciji za primerjavo.</p>
        </header>
        <ol className="ux-lab-list">
            {[...PROTOTYPES].sort((p, q) => rank(p.id) - rank(q.id)).map(prototype => <li key={prototype.id} className="ux-lab-card">
                <div className="ux-lab-card-head"><span className="ux-lab-id">{prototype.id}</span><h2>{prototype.name}</h2></div>
                <p>{prototype.idea}</p>
                <p className="ux-lab-general"><strong>Zakaj velja splošno.</strong> {prototype.general}</p>
                <p className="ux-lab-try"><strong>Poskusi.</strong> {prototype.try}</p>
                <ul className="ux-lab-links">
                    {prototype.links.map(link => <li key={link.path + link.flags}>
                        <a className="ux-lab-open" href={href(link, link.flags)}><span>{link.label}</span><small>{link.family}</small></a>
                        <a className="ux-lab-compare" href={href(link, undefined)} aria-label={`${link.label} brez prototipa`}>brez</a>
                    </li>)}
                </ul>
            </li>)}
        </ol>
    </main></div>;
}
