import React from 'react';
import './UxLab.css';

/** The lane-A tour: one card per prototype, best first, with deep links that switch the flags on. */

interface LabLink { label: string; family: string; path: string; at?: number; flags: string; free?: boolean; extra?: Record<string, string> }
interface LabPrototype { id: string; name: string; idea: string; general: string; try: string; links: LabLink[] }

const PROTOTYPES: LabPrototype[] = [
    {
        id: 'a29', name: 'Kaj počne kateri drsnik',
        idea: 'Graf napiše svojo legendo: na »Kaj počne kateri drsnik?« Bezeg preizkusi vsak drsnik posebej (in vse povrne) ter v eni vrstici pove, kaj počne: »a: graf ostane pripet v (3; 1)«, »c: premakne ves graf«, »u: ne premakne nobene krivulje«. Vrstica na tabli pokaže pahljačo tega drsnika.',
        general: 'Slovarček, ki ga ni napisal noben avtor lekcije: prebran je iz grafa z analizo a27 za vse drsnike v registru. Šolske funkcije, trigonometrija, eksponentna funkcija.',
        try: 'Pritisni »Kaj počne kateri drsnik?« levo zgoraj na grafu, nato klikaj vrstice.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a29', free: true},
            {label: 'Trigonometrijske funkcije', family: 'Trigonometrija', path: 'functions/trigonometric', flags: 'a29', free: true},
            {label: 'Eksponentna funkcija', family: 'Eksponentna in logaritemska', path: 'functions/exponential', flags: 'a29', free: true},
        ],
    },
    {
        id: 'a28', name: 'Napovej, kaj ostane',
        idea: 'Napoved pred odgovorom za a27: ko prvič premakneš parameter, Bezeg pahljačo zadrži in vpraša »kje ostane graf pripet, ko spreminjaš a?«. Tapneš točko na grafu ali izbereš »nobena točka«, nato se pahljača odpre čez tvojo napoved: »Zadeto! Graf ostane pripet v (3; 1)« ali »Ne čisto«, s tvojim križcem ob pravi točki.',
        general: 'Vprašanje si Bezeg sestavi sam iz nepremičnih točk (a27), zato ga ima vsak drsnik, ki premika krivuljo, brez besedila v lekcijah. Pri vsakem parametru vpraša enkrat, nato kaže pahljačo takoj. Šolske funkcije, trigonometrija, eksponentna funkcija.',
        try: 'Premakni a, napovej s tapom, nato premakni c in izberi »nobena točka«.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a28', free: true},
            {label: 'Trigonometrijske funkcije', family: 'Trigonometrija', path: 'functions/trigonometric', flags: 'a28', free: true},
            {label: 'Eksponentna funkcija', family: 'Eksponentna in logaritemska', path: 'functions/exponential', flags: 'a28', free: true},
        ],
    },
    {
        id: 'a27', name: 'Kaj ostane na mestu',
        idea: 'Ko se parameter umiri, Bezeg okoli grafa nariše pahljačo sosedov (parameter malo manjši in malo večji) in pripne točke, skozi katere gredo vsi: teme, okoli katerega se parabola razteza, (0; 1), skozi katero gre vsaka eksponentna funkcija, ničle, ki jih amplituda sinusa ne premakne. En stavek pove »ko spreminjaš a, graf ostane pripet v (3; 1)« ali »c premakne ves graf — nobena točka ne ostane na mestu«.',
        general: 'Razlika med premikom in raztegom postane vidna, ne izrečena. Pahljača je tabla sama, za hip postavljena na sosednje vrednosti (in povrnjena); nepremične točke so skupne točke vseh sosedov iz JSXGraphovih izrisanih točk, tudi kadar se krivulje le dotaknejo (teme). Stopničasti histogrami so izpuščeni. Brez kode v lekcijah: šolske funkcije, eksponentna funkcija, trigonometrija, verjetnost (»p premakne ves graf«).',
        try: 'Na namizju samo pomiri miško na drsniku a, nato na c (predogled brez premika); ali premakni drsnik. V trigonometriji amplituda A in nato ω.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a27', free: true},
            {label: 'Trigonometrijske funkcije', family: 'Trigonometrija', path: 'functions/trigonometric', flags: 'a27', free: true},
            {label: 'Eksponentna funkcija', family: 'Eksponentna in logaritemska', path: 'functions/exponential', flags: 'a27', free: true},
        ],
    },
    {
        id: 'a26', name: 'Časovni trak',
        idea: 'Vsaka umirjena sprememba grafa postane kroglica na traku nad tablo, obarvana po parametru, ki se je premaknil, zato ima raziskovanje vidno zgodovino kot dokument svoje različice. Z miško nad kroglico se graf tistega trenutka pokaže črtkano; klik ali vlečenje po traku popelje cel graf nazaj v čas, Ctrl+Z in Ctrl+Y korakata, nova sprememba od tam začne novo vejo.',
        general: 'Ker je pot nazaj zastonj, je preizkušanje divjih vrednosti varno. Posnetki so vrednosti deljenega registra drsnikov, duh pa nastane tako, da Bezeg tablo za hip postavi v tisti trenutek in jo povrne. V vodeni lekciji trak pripada enemu koraku: rezi lekcije med okvirji niso učenčevo raziskovanje. Brez kode v lekcijah: šolske funkcije, verjetnost, Bézierjeve krivulje, trigonometrija.',
        try: 'Premakni nekaj drsnikov, nato pojdi z miško čez kroglice na traku in klikni prvo (ali pritisni Ctrl+Z); na telefonu tapni ali povleci po traku.',
        links: [
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a26', free: true},
            {label: 'Premiki in raztegi grafa (lekcija)', family: 'Šolske funkcije', path: 'functions/transformations', at: 6, flags: 'a26'},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a26', free: true},
        ],
    },
    {
        id: 'a25', name: 'Partitura lekcije',
        idea: 'Ko se vodena lekcija odpre, jo Bezeg tiho prebere naprej (skozi vse okvirje in nazaj) in pod napredek lekcije zapiše partituro kot v glasbenem urejevalniku: za vsak parameter svoj pas, za vsak okvir svoj stolpec, romb, kjer lekcija parameter premakne, in rumen stolpec na trenutnem okvirju. Načrt lekcije je viden na prvi pogled — najprej d, nato c, nato a, b in u — in vsak stolpec je skok.',
        general: 'Okvirji so prebrani iz gumbov in napredka same lekcije, vrednosti iz deljenega registra drsnikov; zadnjega »Naprej« (konec lekcije) ne pritisne, pri nalogi, ki zahteva rešitev, se ustavi. Brez kode v lekcijah: šolske funkcije, verjetnost, Bézierjeve krivulje.',
        try: 'Odpri lekcijo in poglej partituro pod »Korak 1 od …«; z miško pojdi čez stolpce, nato klikni enega.',
        links: [
            {label: 'Preoblikovanje grafov funkcij', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a25'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a25'},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a25'},
        ],
    },
    {
        id: 'a24', name: 'Izziv za prijatelja',
        idea: 'Z drsniki oblikuj katerikoli graf, pritisni »Izziv« in dobiš povezavo. Kdor jo odpre, vidi isto stran z začetnimi vrednostmi, tvoj graf pa črtkano kot tarčo, ki jo mora zadeti; vrstica bližine kaže, kako blizu je, cvet bezga pove »zadeto«, nato lahko izziv vrne.',
        general: 'Učenci si drug drugemu postavljajo naloge, kar je hkrati priklic in razlaga. Statično in brez strežnika: izziv živi v povezavi (oznake parametrov in vrednosti), tarča se nariše tako, da Bezeg tablo za hip postavi nanjo in jo povrne. Deluje na vsaki strani z drsniki: šolske funkcije, verjetnost, trigonometrija.',
        try: 'Odpri povezavo »izziv« spodaj (pripravljen izziv) ali na kateri koli strani premakni drsnike in pritisni »Izziv«.',
        links: [
            {label: 'Pripravljen izziv: parabola', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a24', free: true, extra: {izziv: 'W3sibCI6IlZvZG9yYXZuaSBwcmVtaWsgYyIsInYiOjV9LHsibCI6Ik5hdnBpxI1uYSByYXp0ZWduaXRldiBhIiwidiI6MX1d'}},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a24', free: true},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a24', free: true},
        ],
    },
    {
        id: 'a23', name: 'Značilne točke',
        idea: 'Vsaka krivulja na tabli sproti nosi svoje kažipote: ničle, presečišče z osjo y ter lokalne minimume in maksimume, vsakega s koordinatami. Ko se parameter umiri, graf v enem stavku pove, kaj se je zgodilo: »lokalni maksimum: (3; 1) → (5; 1), 2 desno«, »lokalni maksimum je postal lokalni minimum«, »ničle: 2 → 1, graf se osi x le dotakne v (3; 0)«.',
        general: 'Točke so prebrane iz SVG geometrije same table (vzorec na vsak piksel, ničle z interpolacijo, ekstremi s parabolo skozi tri vzorce), prikazane z natančnostjo, ki jo risba dopušča, ločeno po oseh; stopničasti histogrami so izpuščeni. Zgodba se pripoveduje krivuljo za krivuljo in jo sliši tudi bralnik zaslona. Brez kode v lekcijah: šolske funkcije, verjetnost (vrh normalne krivulje), Bézierjeve krivulje, Taylorjev polinom.',
        try: 'Premikaj d navzdol, dokler se parabola ne dotakne osi x, nato še naprej; potem obrni predznak a.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a23', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a23', free: true},
            {label: 'Bézierjeva krivulja', family: 'Bézierjeve krivulje', path: 'bezier/curve', flags: 'a23', free: true},
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', flags: 'a23', free: true},
        ],
    },
    {
        id: 'a22', name: 'Raziskano ozemlje',
        idea: 'Vsak drsnik si zapomni, kod je graf že hodil: pod drsnikom raste jantarni pas, zato ostanejo deli parametra, ki jih ni nihče poskusil, vidno goli. Ko ostane gol velik kos, drsnik to pove z besedami — najprej »poskusi še negativne a«, ker se pri predznaku skriva največ presenečenj (zrcaljenje, odpiranje navzdol) — in dotik odpelje graf tja.',
        general: 'Vsak drsnik objavi svoje premike v deljeni register; vlečenje in tipke pobarvajo vmesne vrednosti, skok pa samo cilj. Poskusi drugih prototipov so označeni in se ne štejejo. Ko je raziskana več kot polovica obsega, nasveti utihnejo. Brez kode v lekcijah: šolske funkcije, verjetnost, Bézierjeve krivulje.',
        try: 'Premakni drsnik a le malo levo ali desno in poglej pas in nasvet pod njim; tapni nasvet.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a22', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a22', free: true},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a22', free: true},
        ],
    },
    {
        id: 'a21', name: 'Družina v prostoru',
        idea: 'En gumb spremeni izbrani parameter v tretjo os: Bezeg nariše graf pri petindvajsetih vrednostih, slike zloži eno za drugo in kup nagne, da družina krivulj postane pokrajina — ploskev y = f(x; p) — današnji graf pa jantarna rezina skoznjo. Povleci, da jo zasukaš; premakni drsnik in rezina potuje; »Splošči« vse krivulje spet zloži na eno tablo.',
        general: 'Krivulje so vzorčene iz SVG same table, medtem ko Bezeg parameter sinhrono postavlja prek deljenega registra drsnikov (in ga povrne pred risanjem); okno vrednosti se samo zoži, dokler večina slik ne kaže nečesa. Brez kode v lekcijah: parabole pri c, d, a, b, binomska porazdelitev pri p in n, De Casteljau pri t, tangente Taylorjevega polinoma pri c (premonosna ploskev).',
        try: 'Tapni »V prostor«, nato povleci po pokrajini; izberi drug parameter zgoraj in premikaj njegov drsnik.',
        links: [
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a21', free: true},
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a21', free: true},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a21', free: true},
            {label: 'Taylorjev polinom (tangente pri c)', family: 'Analiza', path: 'analysis/taylor', flags: 'a21', free: true},
        ],
    },
    {
        id: 'a20', name: 'Kaj premika kaj',
        idea: 'Pokaži na drsnik in na tabli zasvetijo natanko tisti liki, ki jih premika, vse drugo stopi v ozadje; pokaži na krivuljo ali točko (na telefonu jo tapni) in v orodjih zasvetijo drsniki, ki jo premikajo, ob kazalcu pa piše »to premikajo c, d, a in b« ali »tega ne premakne noben drsnik«. Orodja niso več seznam imen, ampak zemljevid tega, kaj krmili kaj.',
        general: 'Bezeg vsak parameter iz deljenega registra drsnikov za hip premakne, zabeleži, kateri liki so se spremenili, in vrednosti povrne, preden brskalnik nariše; zemljevid se osveži ob vsaki spremembi. Brez kode v lekcijah: šolske funkcije, Bézierjeve krivulje, verjetnost, trigonometrija.',
        try: 'Z miško počasi prehajaj čez drsnike v orodjih, nato čez krivuljo in točke na tabli.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a20', free: true},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a20', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a20', free: true},
        ],
    },
    {
        id: 'a19', name: 'Poglej, preden skočiš',
        idea: 'Z miško potuj vzdolž drsnika, ne da bi kliknil, in na veliki tabli se kot črtkan jantarni duh pokaže graf pri vrednosti pod kazalcem; vzdolž drsnika duh preleti celo družino krivulj. Klik in pravi graf skoči točno na duha.',
        general: 'Kot sličica nad časovnico videa, le da je predogled narisan na samem grafu, zato ostane graf edino mesto, kamor gledaš. Vsak drsnik se objavi v deljenem registru pod svojim id; tabla se sinhrono postavi na vrednost, spremenjeni liki se klonirajo in prava vrednost se povrne, preden brskalnik nariše. Na zaklenjenih drsnikih lekcije je le pogled. Velja za vsak drsnik v aplikaciji (na računalniku; na dotik ni lebdenja).',
        try: 'Na računalniku zapelji miško počasi levo in desno po drsniku a (ali t, p), ne da bi kliknil; nato klikni, kjer ti je duh všeč.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a19', free: true},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a19', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a19', free: true},
        ],
    },
    {
        id: 'a18', name: 'Kroglica na krivulji',
        idea: 'Kroglica drsi po katerikoli narisani krivulji kot biser na žici: kjer je krivulja strma, pospeši, kjer je ravna, se umiri, in obstane v najnižji točki, ki jo nato poimenuje s koordinatami lekcije. Obrni težnost in poišče najvišjo točko; spremeni parameter in žica se preoblikuje pod njo, kroglica pa se odkotali do novega temena.',
        general: 'Tir je vzorčen iz SVG geometrije same table (grafi funkcij, Bézierjeve krivulje, daljice, krožnice), obrezan na vidni del; zaprte krivulje se sklenejo, zato kroglica na krožnici niha kot nihalo. Bezeg pove le, kar je res: najnižja točka samo, če se žica dviga na obeh straneh, sicer »na koncu krivulje« ali »skoraj vodoravna«. Brez kode v lekcijah: šolske funkcije, Bézierjeve krivulje, trigonometrija, verjetnost.',
        try: 'Tapni »Kroglica«, nato premakni drsnik a ali d in opazuj, kako kroglica sledi temenu. Povleci jo na drugo krivuljo ali jo zalučaj; »teža navzgor« poišče vrh.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a18', free: true},
            {label: 'Bézierjeva krivulja', family: 'Bézierjeve krivulje', path: 'bezier/curve', flags: 'a18', free: true},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a18', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a18', free: true},
        ],
    },
    {
        id: 'a17', name: 'Kam vleče parameter',
        idea: 'Izberi parameter in vzdolž vsake krivulje, ki jo premika, zrastejo puščice: vsaka pokaže, kam majhno povečanje parametra potisne tisto točko krivulje. Pri d so vse enake in kažejo gor, pri c se nagnejo vstran in pri temenu izginejo, pri a rastejo stran od temena, pri t v De Casteljauovem postopku pokažejo hitrost vsake vmesne točke; puščice ostanejo žive, ko vlečeš druge parametre.',
        general: 'To je normalna hitrost družine krivulj (le premik prek krivulje je viden). Tablo Bezeg sinhrono premakne prek deljenega registra drsnikov in jo vrne, še preden brskalnik nariše, zato nič ne utripne; točke dobijo puščico celotnega premika. Deluje na vsakem grafu z drsnikom: šolske funkcije, verjetnost, trigonometrija, Bézierjeve krivulje.',
        try: 'Tapni simbol v »Kam vleče« desno zgoraj, nato premikaj druge drsnike in opazuj, kako se puščice spreminjajo.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a17', free: true},
            {label: 'De Casteljaujev postopek', family: 'Bézierjeve krivulje', path: 'bezier/decasteljau', flags: 'a17', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a17', free: true},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a17', free: true},
        ],
    },
    {
        id: 'a16', name: 'Napoved v številih',
        idea: 'Ko učenec nariše napoved (a5) in korak spremeni graf, Bezeg poišče, katere vrednosti spremenjenih parametrov njegova skica pomeni, nato učenec preklaplja med »tvoja napoved: d ≈ 3« in »lekcija: d = 1« in vidi oba grafa. Povratna informacija postane natančna: »prava smer, a preveč«, »nasprotna smer« — ali »tvoja skica ustreza spremembi ω, lekcija pa je spremenila A«.',
        general: 'Spremenjene parametre pove deljeni register drsnikov, krivulje preverjanje napovedi iz a5, iskanje pa je mreža in vzorčno iskanje po pravi tabli z obojestransko razdaljo in časovnim proračunom. Ko skice spremenjeni parameter ne zmore, Bezeg preizkusi vsak drug parameter posebej in pove, na katerega je učenec verjetno mislil. Preizkušeno na šolskih funkcijah, trigonometriji in binomski porazdelitvi.',
        try: 'Pritisni »Napovej«, nariši, kam bo šel graf v naslednjem koraku, pritisni »Zakleni napoved« in nato »Naprej«. Pod grafom se pojavi »Katero vrednost … si napovedal?«.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', at: 1, flags: 'a16'},
            {label: 'Trigonometrične funkcije', family: 'Trigonometrija', path: 'functions/trigonometric', at: 2, flags: 'a16'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', at: 1, flags: 'a16'},
        ],
    },
    {
        id: 'a15', name: 'Ponovi',
        idea: 'Ponavljanje iz lekcije same: Bezeg si zapomni sliko vsakega okvirja in na »Ponovi« vpraša »ta korak je levo sliko spremenil v desno — kateri parameter? Povečal ali zmanjšal?« ter na živem grafu »zdaj je d = 1; kateri graf dobiš pri d = 3?«, z zvijačnimi odgovori (isti parameter v drugo smer, drug parameter). Napačen odgovor vodi nazaj na tisti korak.',
        general: 'Priklic je najmočnejši način utrjevanja, a vprašanj nobena lekcija ne potrebuje: okvirje bere iz vrstice napredka, vrednosti iz deljenega registra drsnikov, slike pa so posnetki prave table (pri možnostih prek istega zajema kot a13). Deluje v vsaki lekciji z drsnikom; pri enem samem parametru vpraša le za smer.',
        try: 'Z gumbom »Naprej« pojdi skozi pet ali šest okvirjev lekcije, nato pritisni »Ponovi« desno spodaj na grafu (številka pove, koliko korakov s spremembo si že videl).',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a15'},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', flags: 'a15'},
            {label: 'Enotska krožnica', family: 'Trigonometrija', path: 'functions/unit-circle', flags: 'a15'},
        ],
    },
    {
        id: 'a14', name: 'Zemljevid oblik',
        idea: 'Dva parametra, ki delujeta skupaj (c in d, k in p, |w| in arg w), dobita eno krmilo: blazinico v kotu table, katere ozadje je zemljevid — sličice grafa povsod v tej ravnini parametrov. Povleci piko čez zemljevid in velika tabla ji sledi v živo; zemljevid vnaprej pokaže, kje živijo oblike, ki jih iščeš.',
        general: 'Zemljevid je posnetek prave table prek deljenega registra drsnikov (isti zajem kot a13), pika piše v iste drsnike. Med razlago je pika vzmet: spusti jo in vrednosti lekcije se vrnejo. Deluje na vsakem grafu z vsaj dvema drsnikoma; navdih sta XY-blazinica sintetizatorjev in mini zemljevid iger.',
        try: 'Pritisni »Zemljevid« desno spodaj in vleci piko po zemljevidu; simbol v glavi zamenja os. Puščice premikajo piko s tipkovnico.',
        links: [
            {label: 'Premiki in raztegi grafa', family: 'Šolske funkcije', path: 'functions/transformations', flags: 'a14', free: true},
            {label: 'Binomska in normalna', family: 'Verjetnost', path: 'probability/binomial-normal', at: 1, flags: 'a14'},
            {label: 'Množenje kompleksnih števil', family: 'Kompleksna števila', path: 'complex-multiplication', flags: 'a14', free: true},
            {label: 'Taylorjev polinom', family: 'Analiza', path: 'analysis/taylor', flags: 'a14', free: true},
        ],
    },
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
const ORDER = ['a8', 'a27', 'a28', 'a29', 'a16', 'a21', 'a25', 'a26', 'a11', 'a13', 'a18', 'a23', 'a24', 'a19', 'a20', 'a22', 'a17', 'a15', 'a14', 'a9', 'a4', 'a10', 'a12', 'a1', 'a6', 'a5', 'a2', 'a7', 'a3'];
const rank = (id: string) => { const i = ORDER.indexOf(id); return i < 0 ? ORDER.length : i; };

function href(link: LabLink, flags: string | undefined) {
    const query = new URLSearchParams(link.free ? {} : {learn: '1'});
    if (link.at) query.set('uxAt', String(link.at));
    if (flags) query.set('ux', flags);
    if (flags && link.extra) for (const [key, value] of Object.entries(link.extra)) query.set(key, value);
    return `/bezeg-2.0/${link.path}?${query.toString()}`;
}

export function UxLab() {
    const sorted = [...PROTOTYPES].sort((p, q) => rank(p.id) - rank(q.id));
    return <div className="ux-lab-wrap"><main className="ux-lab">
        <header className="ux-lab-header">
            <p className="ux-lab-eyebrow">Laboratorij UX · proga A</p>
            <h1>Matematika pod prsti</h1>
            <p className="ux-lab-lede">Devetindvajset prototipov, najboljši prvi: graf sam postane krmilo, lekcija vpraša, napoved dobi številke, graf pokaže, kaj ostane na mestu, družina grafov se razgrne v mrežo. Vsak je vklopljen z zastavico <code>?ux=</code>; povezava »brez« odpre isti okvir lekcije v današnji aplikaciji za primerjavo.</p>
        </header>
        <nav className="ux-lab-index" aria-label="Kazalo prototipov">
            {sorted.map(prototype => <a key={prototype.id} href={`#${prototype.id}`}><b>{prototype.id}</b> {prototype.name}</a>)}
        </nav>
        <section className="ux-lab-combo" aria-label="Vse skupaj">
            <strong>Vse skupaj.</strong> Prototipi se sestavljajo: kroglica, značilne točke, predogled na drsniku, »kaj premika kaj«, raziskano ozemlje, družina v prostoru in časovni trak hkrati.
            <span className="ux-lab-combo-links">
                <a href="/bezeg-2.0/functions/transformations?ux=a18,a23,a19,a20,a22,a21,a26">Premiki in raztegi grafa</a>
                <a href="/bezeg-2.0/probability/binomial-normal?ux=a23,a21,a20,a22,a19">Binomska in normalna</a>
                <a href="/bezeg-2.0/functions/transformations?learn=1&amp;ux=a8,a16,a23,a12">Vodena lekcija: a8, a16, a23, a12</a>
                <a href="/bezeg-2.0/functions/trigonometric?ux=a27,a26,a23">Trigonometrija: a27, a26, a23</a>
            </span>
        </section>
        <ol className="ux-lab-list">
            {sorted.map(prototype => <li key={prototype.id} id={prototype.id} className="ux-lab-card">
                <div className="ux-lab-card-head"><span className="ux-lab-id">{prototype.id}</span><h2>{prototype.name}</h2></div>
                <img className="ux-lab-shot" src={`${import.meta.env.BASE_URL}ux-shots/${prototype.id}.webp`} alt="" loading="lazy" width={640} height={400} onError={event => { event.currentTarget.style.display = "none"; }}/>
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
