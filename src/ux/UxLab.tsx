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
            <div className="ux-lab-all">
                <a className="ux-lab-open" href={`${BASE}/functions/transformations?ux=c1,c2,c4,c5,c6,c7,c8`}><span>Vse naenkrat: igrišče</span><small>Premiki in raztegi grafa</small></a>
                <a className="ux-lab-open ux-lab-open-alt" href={`${BASE}/bezier/decasteljau?learn=1&ux=c1,c2,c3,c4,c5,c6,c7,c8`}><span>Vse naenkrat v lekciji</span><small>De Casteljau</small></a>
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
