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
];

export function UxLab() {
    useEffect(() => { document.title = 'UX laboratorij · Bezeg'; }, []);
    return <main className="ux-lab" data-content-column>
        <header className="ux-lab-intro">
            <p className="ux-lab-kicker">Izziv UX · pas C</p>
            <h1>Laboratorij prototipov</h1>
            <p>Mehanike, izposojene iz iger, glasbil, ustvarjalnih orodij in muzejskih eksponatov, v službi matematike. Vsak prototip se vklopi z zastavico <code>?ux=</code> v naslovu; povezava »Brez« odpre isto stran v današnji obliki. V vogalu strani je oznaka z gumbom za izklop.</p>
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
