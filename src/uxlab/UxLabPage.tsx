import {Link} from 'react-router-dom';
import './UxLabPage.css';

interface Prototype {
    id: string;
    name: string;
    idea: string;
    generalizes: string;
    links: {label: string; to: string}[];
    try?: string;
}

/** Best first. Deep links open the lesson with the prototype switched on; the same link without `ux` is today's app. */
const PROTOTYPES: Prototype[] = [
    {
        id: 'b12',
        name: 'Primi krivuljo: povleci graf, drsniki sledijo',
        idea: 'Primeš katerokoli krivuljo, premico ali krožnico neposredno na grafu in jo povlečeš; krivulja sledi prstu, drsniki in točke v inšpektorju pa se premaknejo sami. Tangento povlečeš po eksponentni krivulji in središče c zdrsne za njo; parabolo potegneš in premakneta se oba premika; Bézierjevo krivuljo potegneš in kontrolne točke se razporedijo same.',
        generalizes: 'Ob prijemu vsako prosto količino iz posnetka stanja za hip premakne za zamrznjeno kopijo plošče in izmeri, kako se premakne prijeta točka (Jacobijeva matrika iz risbe SVG). Med vlečenjem jo vsak okvir reši z najmanjšo spremembo količin in sproti popravlja z Broydenovim pravilom, z zaupanjskim območjem proti pobegu. Brez kode na lekcijo.',
        try: 'Z miško pojdi nad krivuljo (zažari) in jo povleci; po vlečenju lahko spremembo razveljaviš.',
        links: [
            {label: 'Analiza: Taylorjev polinom (povleci črtkano tangento)', to: '/bezeg-2.0/analysis/taylor?ux=b12'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b12'},
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?ux=b12'},
            {label: 'Funkcije: trigonometrične', to: '/bezeg-2.0/functions/trigonometric?ux=b12'},
        ],
    },
    {
        id: 'b17',
        name: 'Zvitek: lekcijo bereš z drsenjem, graf sledi branju',
        idea: 'Vodena lekcija ni več niz okvirjev z gumbom Naprej, ampak eno samo besedilo, ki ga drsiš kot članek. Ko zadnji odstavek koraka prečka bralno črto, se graf zvezno preoblikuje v prizor naslednjega koraka; drsiš nazaj in se preoblikuje nazaj, kar poskusiš na grafu znotraj koraka, pa ostane, ko se vrneš.',
        generalizes: 'Prizore vseh korakov izračuna enkrat, za zamrznjeno kopijo plošče, iz lekcijinih lastnih dejanj prizora (posnetki stanja), nato med njimi interpolira glede na lego drsenja (točke na mreži po celih korakih). Deluje za vsako vodeno lekcijo brez kode na lekcijo; na telefonu graf obstane na vrhu zaslona, besedilo teče pod njim.',
        try: 'Odpri povezavo in drsi po besedilu lekcije (na namizju v desnem stolpcu, na telefonu po strani). Opazuj graf med koraki, nato drsi nazaj.',
        links: [
            {label: 'Analiza: Taylorjev polinom (stopnja raste z branjem)', to: '/bezeg-2.0/analysis/taylor?learn=1&ux=b17'},
            {label: 'Bézier: De Casteljau (vrstice konstrukcije)', to: '/bezeg-2.0/bezier/decasteljau?learn=1&ux=b17'},
            {label: 'Geometrija: obodni kot (točke se premikajo)', to: '/bezeg-2.0/inscribed-angle?learn=1&ux=b17'},
        ],
    },
    {
        id: 'b18',
        name: 'Zemljevid: vse kombinacije dveh količin naenkrat',
        idea: 'Gumb »▦ Zemljevid« na grafu nariše mrežo pomanjšanih grafov za dve izbrani količini (vodoravno ena, navpično druga). Najprej iz sličic napoveš, kje je odčitek (na primer napaka) najmanjši, nato se mreža pobarva po odčitku z napovedjo in pravim mestom; vlečeš po zemljevidu in oba drsnika se premikata hkrati.',
        generalizes: 'Za zamrznjeno kopijo plošče nastavi vsaki kombinaciji drsnikov vrednost, posname risbo SVG in prebere vse zapise »oznaka = število«; barva je rang odčitka, ki se najbolj spreminja. Deluje v vsakem prizoru z vsaj dvema drsnikoma, brez kode na lekcijo; na telefonu se odpre kot list od spodaj.',
        try: 'Pritisni »▦ Zemljevid« v spodnjem desnem kotu grafa, nato vleci po mreži. Pri Taylorju je svetla diagonala x = c: tam je napaka nič.',
        links: [
            {label: 'Analiza: Taylorjev polinom (središče c × točka x, napaka)', to: '/bezeg-2.0/analysis/taylor?ux=b18'},
            {label: 'Verjetnost: binomska in normalna (n × p, σ)', to: '/bezeg-2.0/probability/binomial-normal?ux=b18'},
            {label: 'Funkcije: transformacije (izberi a × b)', to: '/bezeg-2.0/functions/transformations?ux=b18'},
        ],
    },
    {
        id: 'b19',
        name: 'Naloga iz prizora: vsak graf si sam sestavi vaje',
        idea: 'Gumb »🎯 Naloga« iz trenutnega prizora sestavi nalogo, na primer »Nastavi drsnik Točka x tako, da bo napaka = 1,6«. Odčitek na grafu in v inšpektorju se zamegli, zato vrednost oceniš iz risbe, šele s Preveri vidiš število; dva zgrešena poskusa pokažeta rešitev, zadetki gradijo niz.',
        generalizes: 'Za zamrznjeno kopijo plošče prehodi naključni drsnik, prebere vse odčitke (zapise »oznaka = število« in vrstice seznama Odčitki) in izbere vrednost, ki jo prizor res doseže, zaokroženo na dve mesti. Šteje vsaka nastavitev, ki cilj doseže, ne glede na pot. Brez kode na lekcijo.',
        try: 'Pritisni »🎯 Naloga« v spodnjem levem kotu grafa, premakni imenovani drsnik po občutku, nato Preveri.',
        links: [
            {label: 'Analiza: Taylorjev polinom (napaka)', to: '/bezeg-2.0/analysis/taylor?ux=b19'},
            {label: 'Funkcije: določeni integral (vsota in integral)', to: '/bezeg-2.0/functions/integral?ux=b19'},
            {label: 'Verjetnost: binomska in normalna (σ, verjetnosti)', to: '/bezeg-2.0/probability/binomial-normal?ux=b19'},
        ],
    },
    {
        id: 'b20',
        name: 'Pripni in primerjaj: dve nastavitvi, ena ob drugi',
        idea: 'Gumb »📌 Pripni« ohrani trenutno risbo kot vijolično sled na grafu in si zapomni vse odčitke. Ko raziskuješ naprej, majhna tabela kaže pripeto, zdaj in razliko; »A ⇄ B« graf zvezno premakne v pripeti prizor in pripne tistega, ki ga je zapustil, zato dve nastavitvi menjaš kot diapozitiva.',
        generalizes: 'Sled je posnetek risbe SVG v koordinatah ravnine (sledi premiku in povečavi pogleda), odčitki so vsi zapisi »oznaka = število« in vrstice seznama Odčitki, menjava je obnova posnetka stanja s prehodom iz b1. Deluje v vsakem prizoru, brez kode na lekcijo.',
        try: 'Pritisni »📌 Pripni« zgoraj desno na grafu, spremeni drsnik ali stopnjo, nato večkrat pritisni »A ⇄ B«.',
        links: [
            {label: 'Analiza: Taylorjev polinom (stopnja 1 proti 3)', to: '/bezeg-2.0/analysis/taylor?ux=b20'},
            {label: 'Geometrija: obodni kot (lok proti nasprotnemu loku)', to: '/bezeg-2.0/inscribed-angle?ux=b20'},
            {label: 'Verjetnost: binomska in normalna (dve vrednosti p)', to: '/bezeg-2.0/probability/binomial-normal?ux=b20'},
        ],
    },
    {
        id: 'b21',
        name: 'Ukaz: povej grafu, kaj želiš',
        idea: 'Gumb »⌨ Ukaz« odpre ukazno vrstico za graf. »x = 2« ali »n = 4« nastavi količino po črki ali imenu; »napaka = 0,01« pa poišče, kateri drsnik in kje da tak odčitek, in drsnik zdrsne tja. Če cilj ni dosegljiv, pove zakaj, na primer da obodni kot pri t ≈ 203 skoči z 66,8° na 113,2°.',
        generalizes: 'Količine najde med drsniki in števci v inšpektorju (črka na koncu imena ali v oklepaju), odčitke med zapisi »oznaka = število« in vrsticami seznama Odčitki. Iskanje cilja prehodi vsak drsnik za zamrznjeno kopijo plošče, najde prehod čez cilj in ga izostri s sekantno metodo na pravem prizoru (kot Goal Seek v preglednici). Brez kode na lekcijo.',
        try: 'Pritisni »⌨ Ukaz« na vrhu grafa in vpiši ali tapni enega od primerov.',
        links: [
            {label: 'Analiza: Taylorjev polinom (n = 4, napaka = 0,01)', to: '/bezeg-2.0/analysis/taylor?ux=b21'},
            {label: 'Verjetnost: binomska in normalna (σ = 3)', to: '/bezeg-2.0/probability/binomial-normal?ux=b21'},
            {label: 'Geometrija: obodni kot (∠APB = 100 ni dosegljivo)', to: '/bezeg-2.0/inscribed-angle?ux=b21'},
        ],
    },
    {
        id: 'b14',
        name: 'Živo besedilo: simboli v razlagi so drsniki',
        idea: 'Črka v besedilu lekcije, ki pomeni količino prizora (»središče c«, »stopnja n«, »x = 1«), je podčrtana s pikicami: ko greš nanjo, se prižgejo vse njene ponovitve in njen drsnik, ko jo povlečeš levo ali desno, se graf spreminja. Dokler lekcija drži prizor, se graf po spustu vrne v sliko lekcije, kot vzmet.',
        generalizes: 'Simbole najde v izrisani matematiki (MathJax) vsake lekcije, kadar formula vsebuje samo simbol ali »simbol = vrednost«. Količino poišče po imenu ključa v posnetku stanja (n, p, omega → ω) ali po zadnji črki oznake drsnika oziroma števca, domeno pa vzame iz drsnika. Ni kode na lekcijo.',
        try: 'V lekciji povleci podčrtano črko c ali n v besedilu desno od grafa.',
        links: [
            {label: 'Lekcija: Taylorjev polinom (c, n, x)', to: '/bezeg-2.0/analysis/taylor?learn=1&ux=b14'},
            {label: 'Lekcija: binomska in normalna (n, p, k)', to: '/bezeg-2.0/probability/binomial-normal?learn=1&ux=b14'},
            {label: 'Lekcija: obodni kot (t)', to: '/bezeg-2.0/inscribed-angle?learn=1&ux=b14'},
        ],
    },
    {
        id: 'b15',
        name: 'Pokaži mi: roka, ki pokaže navodilo',
        idea: 'Vsako navodilo, ki imenuje količine (»Premakni središče c in točko x ter spreminjaj stopnjo n«), dobi gumb »Pokaži mi«. Prosojna roka kot v vadnicah iger seže po imenovanem drsniku ali gumbu +, ga premika, graf se spreminja v živo, nato se vse vrne, kot je bilo.',
        generalizes: 'Navodila najde v pozivih »Preizkusi in opazuj« in v okvirjih lekcij (stavki z velelnikom in matematiko). Imenovane količine prepozna kot b14 (simbol, ime ključa, oznaka drsnika ali števca, v navadnem besedilu »samostalnik + črka«), premika pa jih z obnovo stanja, zato roka in drsnik vedno kažeta isto. Brez kode na lekcijo.',
        try: 'Pritisni »✋ Pokaži mi« na koncu navodila pod grafom ali v okvirju »Opazovanje«.',
        links: [
            {label: 'Analiza: Taylorjev polinom (c, x, n)', to: '/bezeg-2.0/analysis/taylor?ux=b15'},
            {label: 'Verjetnost: binomska in normalna (n, p)', to: '/bezeg-2.0/probability/binomial-normal?ux=b15'},
            {label: 'Funkcije: transformacije (b, c, d)', to: '/bezeg-2.0/functions/transformations?ux=b15'},
        ],
    },
    {
        id: 'b13',
        name: 'Predogled: kontrolnik pokaže, kaj bo naredil, preden ga pritisneš',
        idea: 'Z miško počivaj na drsniku, gumbu + ali −, puščici ali stikalu (ali se nanj premakni s tipko Tab) in graf bledo pokaže, kaj bi se zgodilo: vijolično en korak naprej, sivo en korak nazaj, puščice pa, kam gre kateri del krivulje. Vklopa ne pokaže vnaprej, ker je to razkritje: najprej napoved.',
        generalizes: 'Kontrolnik za zamrznjeno kopijo plošče zares sproži (drsniku nastavi vrednost, gumb klikne), primerja risbo SVG pred in po ter prizor obnovi iz posnetka stanja. Deluje za vse drsnike, števce in gumbe v inšpektorju in pod grafom, brez kode na lekcijo; gumbi, ki shranjujejo, odpirajo ali razkrivajo, so izključeni.',
        try: 'Na namizju z miško počakaj na gumbu + pri »Stopnja n« ali na drsniku.',
        links: [
            {label: 'Analiza: Taylorjev polinom (gumb + pri stopnji)', to: '/bezeg-2.0/analysis/taylor?ux=b13'},
            {label: 'Verjetnost: binomska in normalna (drsnik n)', to: '/bezeg-2.0/probability/binomial-normal?ux=b13'},
            {label: 'Geometrija: obodni kot (drsnik lege P)', to: '/bezeg-2.0/inscribed-angle?ux=b13'},
        ],
    },
    {
        id: 'b16',
        name: 'Sled na drsniku: najprej napovej, nato poglej vso pot',
        idea: 'Gumb ∿ ob vsakem drsniku prehodi drsnik od začetka do konca in pod njim nariše, kako se spreminja odčitek prizora (napaka, kot, verjetnost). Najprej te vpraša, kje bo odčitek najmanjši ali največji; tapneš, nato se krivulja razkrije s tvojo napovedjo in pravim ekstremom, tap na sled pa drsnik prestavi tja.',
        generalizes: 'Drsnik zares premika in po vsakem koraku prebere vse zapise »oznaka = število« na plošči in v inšpektorju, nato izbere najbolj ukrivljeno odvisnost; prizor obnovi iz posnetka stanja. Deluje za vsak drsnik in vsak odčitek, brez kode na lekcijo.',
        try: 'Pritisni ∿ ob imenu drsnika, tapni napoved v okvir pod njim, nato premikaj miško po sledi.',
        links: [
            {label: 'Analiza: Taylorjev polinom (napaka vzdolž x)', to: '/bezeg-2.0/analysis/taylor?ux=b16'},
            {label: 'Verjetnost: binomska in normalna (P vzdolž p)', to: '/bezeg-2.0/probability/binomial-normal?ux=b16'},
            {label: 'Geometrija: obodni kot (∠APB vzdolž lege P)', to: '/bezeg-2.0/inscribed-angle?ux=b16'},
        ],
    },
    {
        id: 'b4',
        name: 'Ujemi obliko: izziv, ki ga ne moreš nehati igrati',
        idea: 'Trenutni prizor postane vijolična tarča, graf pa se strese v bližnji veljaven prizor. Z vlečenjem točk ali drsniki ga pripelješ nazaj; merilnik kaže ujemanje, ob zadetku zacveti bezeg in niz se podaljša, z nizom pa raste število premaknjenih parametrov.',
        generalizes: 'Tresljaj nastane iz posnetka stanja (točke premakne kot celoto, parametre pomnoži), tarča in ujemanje pa iz vzorčenja SVG-krivulj plošče. Deluje v prostem raziskovanju in v okvirjih za opazovanje vsake lekcije; namig in rešitev uporabljata prehode iz b1.',
        try: 'Pritisni »Izziv: ujemi obliko« spodaj desno na grafu.',
        links: [
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?ux=b4'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b4'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?ux=b4'},
        ],
    },
    {
        id: 'b6',
        name: 'Pahljača: vsaka količina kot niz sličic',
        idea: 'Vsaka prosta količina prizora (drsnik, stopnja, točka) postane trak sedmih sličic, kot pri Bretu Victorju: lestvica abstrakcije. Izbrana družina se bledo nariše tudi na graf, s potegom po traku pa graf drsi skozi vrednosti; spusti in vrednost ostane.',
        generalizes: 'Količine najde v posnetku stanja, domeno in ime pa prebere iz drsnikov v inšpektorju (veže jih po trenutni vrednosti), zato ne gre izven tega, kar graf sprejme. Sličice so kopije narisanih SVG-elementov plošče; količine, ki ničesar ne spremenijo, izpusti.',
        try: 'Pritisni »Pahljača« spodaj levo na grafu in podrsaj po traku.',
        links: [
            {label: 'Analiza: Taylorjev polinom', to: '/bezeg-2.0/analysis/taylor?ux=b6'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?ux=b6'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b6'},
        ],
    },
    {
        id: 'b7',
        name: 'Kaj premika kaj? Rentgen konstrukcije',
        idea: 'Dotakni se kateregakoli elementa na grafu in izveš, katere količine ga premikajo; njihovi drsniki v inšpektorju zasvetijo v isti barvi. Ali izberi količino: kar je odvisno od nje, zažari, vse drugo zbledi.',
        generalizes: 'Vsako prosto količino iz posnetka stanja za trenutek premakne za korak za zamrznjeno kopijo plošče in zapiše, katerim elementom se spremeni risba. Elemente prepozna po videzu in vrstnem redu, ker nekateri grafi ob obnovi vse narišejo na novo. Brez kode na lekcijo.',
        try: 'Pritisni »Kaj premika kaj?« zgoraj desno, nato se dotakni krivulje ali premice.',
        links: [
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?ux=b7'},
            {label: 'Analiza: Taylorjev polinom', to: '/bezeg-2.0/analysis/taylor?ux=b7'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b7'},
        ],
    },
    {
        id: 'b8',
        name: 'Posnetek: pokaži z roko, pošlji kot povezavo',
        idea: 'Učitelj ali učenec posname nekaj sekund dela z grafom, doda napis in dobi povezavo. Kdor jo odpre, vidi isti graf, ki se premika sam, s prosojnim prstom, ki kaže, kje je bila roka, in lahko odgovori s svojim posnetkom.',
        generalizes: 'Posnetek je prvi posnetek stanja in številke, ki se spreminjajo, ter pot kazalca; stisnjen (deflate) živi v delu povezave za #, zato ne potrebuje strežnika. Predvajanje obnavlja stanje grafa, zato deluje na vsakem grafu s posnetki stanja.',
        try: 'Spodnje povezave so že posneti primeri. Na kateremkoli grafu z ux=b8 pritisni »Posnemi« zgoraj levo.',
        links: [
            {label: 'Posnetek: Eulerjeva premica', to: "/bezeg-2.0/euler-line?ux=b8#uxclip=7d3NbtzIEQDgVxF4prld_926JUCQBEmQg4FcDB_GFu1MdjwSpNHCu4YeIQ-x75J9r6CK0q6zOScogHURzGmOhmN9KBb7r75M303XME_30_X0zbv1h_XjK1zaN-vjab1_dTqe12me3k_X058On27vv709Ha_u7tdPh2_P608_Xt1-PB1_-vFf_1znqz_MV7-_Op6v_np1-3A5nNd_3F6dD1freTv_-P64TPP0brr-Mr27PdzfvL4cLut29Hi-OZ4__vb283T95pUsQKwg1LefMusyvjpmxRnwv056Rb86C-zt0zx9vD_c_f3njzqej5fj4XT8Yb2Zri_3j-s8fbq9WU_e5v-Yrqe72-P58uBf-XT74Kd9OJweVv9Fx5vXl_Xud5_vbs_r-TJdt_nl5Os3X6bP8cL303V7muPI_uMI40ie_Jpuv1vvT4fvH_xTL_fHw_njaX25nPfr-XK_Prwcxn__S9Px_v0vJ56P5_Xl458v0U94_PRyWrz4NE_r58Onu9P6x5vperpZPxweT5fpaZ5uDpfD__drX-4P54fjer78_OeI3_N6vfzm5uYvcRkv13xzfLg7Hb7_-cSH4w9rfNDh8_Fhup4Op9P0fBl_PrxbTw9_Oz4c37385zw9zdPddP3m7Tx9mK7fvGnz-fF02n60t_Mb4ja_aosOpNZnWlBVRrRos2gxQGNv6Q1wa5GtpXUwmmkhbAbRYtt7pFFr4i29k20t23tIxHTMtHCntn2OjbgCUGXVmRZt3Lf3dIa5LU15NPJrMyHbrqCPNreFqBPDTMvAoVvDYG_QQD_zAoTP32YYz20ZOkhg5oVIRKMBGtIMCzLamHkRALbnBvMGNgb_VaqNti8JEO9QpfgM6_j8OjabYRkg3WZeBvPLb0KJBusjGrq058-mZjP6S6M_v6Kt_fIK-Csd1d88COLNQwlnmL9MHx5PpwogFUB-HUBer6f1_cU_Fef_XVR5Cpq2uUYd4XrwKJpFMwPNsUVN6iJO0zqUzJKZQqbJDEsfzTx7GIqgRbNoJqCJDYMmDoJIYEGLZtHMQTOipglj0ATVuqEXzRQ0AVp0Bwh7qtm7FcyCmQKmjBkWUWrsMAU7F82imYEmkt_OmTV6RDsw7L5TE_ZJE9LRHDjDQmDot3Oz1qVoFs0MNIl94AmMYoDJkFpFzaKZg2ZEzQbaPddUa7r7XLNo5qDJjHNbAknYBLLd9x2VzSQ2B_l8FRNWv6WLqO2--6hs5rApETcFOpPHTWlMu5_eUTZz2FQwnwBo0sTjJovK7ocqtzbem82vv3YOm3FPRxaKuMlAuPu4WTZz2LS4pwMOjHyTjGX3-WbZTGJzuM2G2oV9PjFx490_qBfOHDh9LcorX4wCo6FP3CRovXAWzhQ4B8YSKjJfdsULdrHdD1oWzhw4B284R2fxlW2ogoWzcObAOeK2jqwYsze9Q75yzsKZASe1LXJib9TJcZI_IhXOwpkB55ZzUmtdI3IStOrmLJwpcML2tE7NdETOib0WABfOHDgZZcPJaD1wotQDUeHMgdM0cs7BjXyECBtZjawXzhQ4ZYucaDpixxkwf2ovnIUzA87nyCnUzHNOwF5r1AtnDpyKG05EirH1Zoi7X6BROJPgtLitQ2eL5cCtEdVtvXCmwGlbzgk-GWnEXqMwqHAWzhQ4t5yz9YG-KS0tHW3UtKTSmUJn30JnIwDz0GkIUk9EhTMHztgQvBFpx9h1HMtm2cxhc7D6Ko0mvlKdFrY2amg9jmifNimNTW6tu81OvtGh137QUR1JZTOHTS_2saAXM_G4CeZjmGWzbCaw6bPjvP4NS1TTaUBW9_SymcNmxE0magNmXLp6taSyWTYT2ET0fFMaW59xMeq4-ynwsE-akI6m-WO66FD2sKkwymbZzGGTUHxjOTQ1nnERwFoRXDaT2BwWmx52X5SBC0Pf_ZDl9jfCfdLEPDRZPNs0jLqxuBBZ7XlYNnPYlOh5Ny-7POOC2qvaatFMQjM6kGyAkGebCFj1XMpmDpsKXhK-gzDNuIB2rGyzaOagGdlmJ-Th2SaQl8Mqm2UzgU2L8crOGP1HAB0qbBbNHDRl_FLQxW1CbYtUNlPYFN8cti2-_yZFugmkZbNs5rAZ45V9gNp2S68hoaKZgybEcOXgLqpuE61qZpTNJDY9TC4NfeaRIxq1fXHRzEETneIC1DSSTeFKNotmEpoRNVHEp22CUZVyKZk5ZFIETd_fMILmkNqmq2gmoTmcppiXrMYFY1OPndPEfdLEbDSdJCym1r3zCKXh7ocqi2YSmj78s4zOLWh2tIqaRTMFTYmVQYjUPNck6LvfS7tkJpE5PMXkziYuU6wWYRTNHDRVPWh66RYPmtya7J4m7ZMmZaPps-Jo2TbmwoWZapiyaCahKU6Tnue5c0fZ_QN60cxBs5NveSTCNGIteufdby_DcbS7tehff-0cNIdvm23WfNqRSJWwLJg5YA52mEO5xf4dNqrqQNFMQnN4NWogjgF0bSK779UsmiloauMolN4xphErWhWvLJpJaA6YeeFmPaImaxX9LZo5aIJ6wUqBhp5rqtZ6ymvZJ03JRhObl0iXHhskqFGNUpbMJDLFZSqrBc2OXEGzaKagSRE0tbcRqWY32X1_e9FMQlO8_PRWocVp1mLKopmEpjJG1PQ-I1x0aKtcs2jmoBk97moxm9hAa0Jcycwh07agKRAbv5q0qhxUNJPQjA53hcFROWj0mhBXNHPQ7Ow0xbpg1FtrbffDlEUzCc0RY0HY2dcFDZKqaVU0c9AcMUzJOrD7Igz0qXE7p1kj6CloWkOJyR1RdhpVdh8zC2YSmMYzL4S-DTEtyKi7fwgqmjloQsRMJANfHUSGVc-qaCahOZwmMIj6wjWQqsuy_Y14nzQ5D02MDvdG2m0mnxEHu9-9sGgmoTk8xxzo049o6Uw1jbho5qBJ7DR7G-jTjxpwbRFXNJPQHN5pZI3VU06rYuglM4lMjqCpbTQfrSQQ2v0oZdFMQjOCpte_8IlxzAL1gF40U9AUbTMFSe9DEgXa_VPQtiGV7I3m1187BU2NB3My7bE-SKnvvu-oaCahKUETzDzXNEHd_QN60cxB0yJqopr6UHpHs92PUxbNJDQjaiKqmtPsPjOuaBbNBDR7RE1ffOE39OEbZpfMkplBZgRNMGz-gD4MqpJV0cxBc2xBU7pnmmNA7V5YMpPI3IJmkHGaVciqZKaQ2RE5ZG5bv5bMkplGpoVMbjBKZslMJJO2mIkEWDJLZiaZJr62d3jtv5JZMvPIZAyZWg9ABTMXzC1kUhsls2RmkikYe8h0FSuZJTOTTONtdyMqmSUzk0yNmNnNqB6ASmYqmRYyAbliZsnMJNMiZprXViuZJTOTzIiZqogVM0tmJpk9YqaYjhoCKpmpZEatPx4gdTffjnCfMjGbTJ8EhwsDNS2ZJTOPzNGayySG6s8smblkis24oKlAySyZiWRCxEyEzpVnlsxUMrXNuIBa9RqVzFQysfmzOSD2mtJeMlPJjGfz1oW4ZJbMRDIp8swmrNXTXjJTyRS_mzdqVjJLZhqZb5_-DQ"},
            {label: 'Posnetek: Taylorjeva napaka', to: "/bezeg-2.0/analysis/taylor?ux=b8#uxclip=pZjPbtxGDMZfxdBZUWb4ZzjcY9FjbwV6MXyQazXddLs2djeFk8KP0Ifou7TvVfCT19lotKcayGd5-BOHM6RGVP7s_ug2ue8O3aZ7fz99mT68oyG9H_fj7vNxe3x_Gj_vHg9d3_3cbbrvdx-nm8eHm-Nhetj--_c_f403P998nG7249P423jzx_TPXx_Hoeu7-27zZ3f_OB4efjyNp2n-69P-Ybv_8N3jc7e5faeDMosmS0KkrNSXQdPlT-6XDPfv0iD-zU_lu5e--3AYn359m2q735624277ZXroNqfDp6nvpufx96fd1G266fkpVjPtT9Oh26S-e5g-HKYJm_AMRaQ_bY_b-7jhl3F3nF767mE8jeH8_3s6Hcb9cTvtT-eAw_v2-LQbP78t4bj9MsHn-Lw9dptu3O26vnt63O5PP4z30-745jXW9_LSd0_d5vb2ciMiiLv-dg4cf9z13S9BpX7_abebJfW5z3f9LXNZGfVqfRqYXbNg88lV9c2cE4dds5ho2DmXSuXCjvtL4ZQt7ERZ2L_aM5c-DVaFOYc9C7Nf3J9r2KvVUnF_qlRc61eAiPo0uJRUUR2JnbnKBWA5gFqUMEPKzHRhZ8r9bEhSlJS_mkrWhSmfTVW0zzHOdR1wSgFk06V9SAQBVSWu2Vs3Q4JJ7vpbSuJxbfFMNJhBAss5bslpzVueBViNALKatt5ygQRGEp7nfC0xmiUwjk0aqKZELVYhwEpgrCINxbMlKMEKhE1bTGDCfkiNASWXds74NSgHphLzF06pTUJhSGAlRaqMfSU2EwiwEvtRpdZ20qqQwIxjd11c2kldIcBq6mlIknk5aYxCAqscWCYRa7BMEGBe49prXU5KQ1CAvIRfKiLL8ohRSJwDKcc1UzyaS4wJAsw8rovLsjxoYIMEliWuJdXaLkBmAeYxqfCaNxFIYFQ4rkvmFW_wgCUw4jyfSd9SCAeh8TynrYZWIYEVnweottt2gdk8v4svyyNGIcAwqWbxdlKdJbCKhapwU7oxCgnMUQNqntsq0goBBm-FmNqUFoLc9beSKOIs7cNHQ6kQUFiBsWrrzAQSWBbtaaiJrfUWzuBrTns193aZFRSwOe1eJLebBg8eaRfOuechaWmOBe4ZgFrPQ9ZSllX2CkgKgLT4cm1nAB5YnJZn5yug8CDMwlcAeNAUT-MqUFIJwKw5Z86A1p6HwubLgnwFDDEUT_mKB0MMxkJXYqiIwSzxlVXU2YNXubIPjhhqrnJlJ11jitoW-GzXlCrs0rylXgHyFACxr8eoLAkx0pVc6ZxtY2_O4DOAVZaiV7ZB52yrxZm5DiBXotwczK9ASR4FlUvzlj0DrzVrtp5ttYyHw2paBkkDXgtegeG8Ngu8eWwrJLD5haOqqT3tFEdXAYbXF-e8cijyLIE5jtska0dKUggwvBitcm5bDauQu_62JDRdyu4tpgIJbG6DOJuv9BoEAQbPOVtqsYwOCRiRR__IRnWZ4-g7IeA8Ol2zWmwZXTS4kOC4cHTEkmn5cMYoJDDJ0dcqiafWnc42cCWuhdya7iUNwpDglFM08qpGy4ylAU04F3AWy-VEVVe4-BdUoVgQWW5fxDEMAeca1yVpWVZdDEOCcxNcU9uTXnKWsAoqzs0L73JeS474aiJtd3mOPZJhWeDbVUub3PNqLSO1nJV0-RSnqKg0V5QRUsvs3E7KAgmM51QUs5U5MRPWwBWZTUmbb4g0hDc4i8Ywcmy2sgIBBk4zasGcV4KTCgGHNSgpWZsxhQ17MleAmupKecIEd_EiTdGCU_M2i2FIcNGqpaFU8aZdiGEIOBSUsZK3hYIiQvdhFb6tZlpZ7ten0RzLqETtyzSGIeBwT1X35sBLw_yNGgVa5wKtTrU5VWIYAg4l5ZSp6RNiGBJcLvPnrXJzHqcBe4HPiUpIrxfxpq-MYQg4rMNril6p4WZbcIx9cc_UNOQxDAFnWIfHTq9-CFdpvq_fTKWWK5_etdr8-Syvhyllz3b-f4O7l_8A"},
            {label: 'Posnetek: Bézierjeva kontrolna točka', to: "/bezeg-2.0/bezier/curve?ux=b8#uxclip=dZjNbiTHDYBfRehzq81_snS0c0icADGwQRBgocNoNV6PPZEW0miztrGP4FfKyXmvgKzq6ZHjXKSZjywWi8Visebn6eN0g_P0NN1MX9ztf9q_v6YF8tNh__TFu5enj_tpnt5NN9OfHx9OT4_Hh93V6fHXX37YXX087n_9ZX_1w9Ph48vx-8erH66e93eH-Wp39f3-6mF_df_4vP_Pv_fLNE93083P093j7un-zWl32vdvLw_3h4f3Xz5-mm7eXvvSQBo1dRcTjzbr_L_sWm8_z9P7p92H786GnvfH_bvT_v6r9PWvH06Hx4fpBuapfH8zhNPNt7vj836eDg-H02F3PPyU7PT0sv88T_e70266eft2-vrNP76shX_V1_3z9OHx8HB6TuG1zNd8O7-95plu57dUf3m-ptvbeXo-O_Pd478OD--__vT-mzEy55hX_lWP4TePxx_fp5vDqU36cf_pjy_H428lf9i_2z2f9sfvdy9v3n23_-d-U3i5uz98PDwfHh_-Nt3AovN0vymvaP_p9LT78HjcnboeLvT5czp-eto9PB_2D6ffD-efHu73n6ab60yQGrs7Fs-IPLwcj7kb94fnD8fdj5uBw0_72oDdp8PzdDPtjsdp7oH8y-5uf3z---H5cHfcj_B_nqcPFfzahRlmnNeozzTD7fx_JJjuf5sjYU5X-h-Yx8YwzdewjLSBRZAI8SzWFiUWVaYUk2hrZ7FJSzGHu0mKDd1oE_fR1FCCZ1iU2GETu5QY1SynNgRB26SREwKaoaZtJ2zgZ3FwWiQKqQ-hgc6btAaLhxvPuAA22hbVailubqAzLgQK28hmyUBN8j83CN1krSUD85hxUcXYQoEgBTFsxsUiLpaC0FJmDXO8t5zjLMMaF5RBwCXC-GIghsy4NKLm-b_CuMqIKVmAl06o-IUwaC5x84sFoHq7wLjiAB2YkArnZyEvoUoHLu0sdIdIYYMhFCNdhRLCJVTuAAxxFUJwCgmgexgqugpDza2EY6Q3FBlCb-w1Esecjhmy8bGRlmwMNIZYhcZ9RhrjlFnWhShrK9kYJyS5H-Ozg6SQoQsZBHwIMwuwhGMkZoIOIbq0mlLGIoEi1vAAo9WcUoGFJUJ12M0vIVJixVbElTOJx2cz85J6J8ZMRPP6xVgqDoZRREkohlTJJcrnzLV-nC3OMwsDeNn2MZgFAnCIWQR7HH2MJjOydWqyZlKjY4wm4BGQ_GxGNXU4FEFFjXVqVAUtvxt7J4hrWuQXad12Cy0CQR60RgXCqLU0z8BDwVQDVufAGkLtCMNqQVuI6VmB2ZtXQaxz2BoTl5q7YabgBTOkZlU9haBOAzUsZVRw7spnpiCmpdwtcwNLgSAEdd0zEqPIA8DKWX6ioZWATKKcvWAMINyVM5BLMHitBTxT0br2ChGpHxG2Mu1qxFl-AZWQvLQvIBpplHpU7bKoiwKEGL17cmYcjljxcM7ql0nazThro669QWvNuGx7FUtR1DKE0ICjtC-YcuQp5Ci_mSisBBmRHusLJn0ToyKCAdZ5IxmGNxbhVIYz5_KIZnnL60qAWze8MTarg8UtrK4bNeZ-uZFimh5QCkZ4nRXJfITFwnhclSImXOqXEIJKO2v1ogwGXoJGmpX_NYzw9Fswb4r8Kl0gbBzddsF-dTNJ6-rleRpULIlra93zS0hQNUKorKOIcVlXRBmeFyzrCq7Q1cMrgxnGNqtUHcEz7QM4XMsdVu0JJS2LVcqs9TN9xtKxBmdFFIGyjNhEuk-NXL2PuKARrl4DVPpWA1egDVHXGTaYayj7Cn2zyb1LyBCH-QtIvZSIdutkaH1iY1MZ5otap6RYMbJhP7BZKZmQ1xa8phxe5UUywdd0oj5AItYZLiiEZCWQ7DBKpBBjctVVfWModQNJ8-6QC_ZezPLErvaT9nVB3pjZDsKwr9qwx9qgLujXUE2MS9-6PgO3ClYW8rozfkMhuCZAgn5gXXu4BYGHfsGe1NBPo2K3j-ripcPgiOsOX1BmzIxQGvYRoK8dQ1HWDALwkRsojKXfJwDVvB9GZgqQjTQt3suagDfJsqZMUHXYLJvCNKyQreMKta4RxNBKJGVLLXCNwOpqG7P1Y9-hF7ReU1SwjCpJVgtpwMN4ISzGVrVNpUwTG2dXvzhYvxkGq54CGlVPkQ1t1g7yvBhhaZKz93qyMTaryGhZzqqSp3xB19qngVqhgMxKtYqHAolXA90Qu2qiKMLlgHkpehvNdARqV0yUY7VBNWzqWG8GCaa6zsyk27xAUf2iej0vHIHrsiVtXXMjUbeX9kC7afWmC5hZj9UFimpQNcpmYO_w8jKxXhs31MBqC1pFNZQU2kz5Gsqm_jXiary01fojlElmWtiNxtWyocB0wKCsNoQQn2kRWff1ArG3Uq2datTAI3nU7fgKNagMMKyoNgFAm2lRdOixukDRrWL5WvmQy1UyGZpnEnXmTJSLm4cXl1hVzSP64EoqUyiuhsbFAYfqhrDV21I1k7c55sM1_SLuO5CoE6myawY1f-PcTloUkHtUC5VL0MuDVUexAHULEp4J8opUm2leCQ5qWJF2GGpngEPPMo-hWUVZmvcmZAXa9zKqi0ThTsm494UbGZuezTMu2Cwwc6E1753pSgS6Xn9okuY5zJwB6P3MRoZ_rfxjwnwuLsy1rlek1dXogG2c06SA1D08A0YttXqvimPkXpER9ok3IvVudKxmTqW13BKqJxa-Igr1K8B4T1MemjxnDr1V3UjrFqm6OAuv5EcV6hY3YmSlGFUdxPIlsCCJ9rVsxKp7cK5m1lt2SbRA89EVrgQBqvdxLoshFuk6eH9CXpJhUXpXHy65C6CCo6c_E6se3aUsNsI6McDWuuJGGpTF_k5o6TcQRY_N-FqWtFvyMQ6xre-TlUgVae_PghZeg0Gwp_QZDM-s9qM1qw675a8E43FkdZQBUMues_7OTw0BgL_zw0T0dAOqy3tpnk_HszB_6aAFol6ES7R2Ft5-_i8"},
        ],
    },
    {
        id: 'b10',
        name: 'Poslušaj graf: oblika kot zvok',
        idea: 'Izbrane krivulje zazvenijo: višina točke je višina tona, levo in desno je levo in desno v slušalkah. V zanki vlečeš točke ali drsnike in slišiš, kako se oblika spreminja; dve skoraj enaki krivulji utripata in se zlijeta v en ton, ko se ujameta.',
        generalizes: 'Bere narisane SVG-poti plošče: grafe funkcij preleti po x (zato se dve krivulji primerjata pri istem x), parametrične krivulje po dolžini loka; vrzeli in deli izven plošče so tišina. Spletni zvok v brskalniku, brez strežnika; pomaga tudi slepim in slabovidnim.',
        try: 'Pritisni »Poslušaj graf«, nato ▶, in med poslušanjem premikaj drsnik ali točko. Vklopi zvok.',
        links: [
            {label: 'Funkcije: kotne funkcije', to: '/bezeg-2.0/functions/trigonometric?ux=b10'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b10'},
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?ux=b10'},
        ],
    },
    {
        id: 'b2',
        name: 'Napoved: najprej nariši, potem poglej',
        idea: 'Preden lekcija spremeni graf, ga zadrži v starem stanju, razlago zamegli in vpraša: kaj se bo zgodilo? Učenec s prstom nariše napoved, nato se resnica zvezno pripelje na graf, njegova črta ostane kot črtkana sled z oceno ujemanja.',
        generalizes: 'Napoved se sproži sama ob vsakem prehodu, ki spremeni graf, in se oceni z vzorčenjem spremenjenih SVG-elementov plošče; ni ročno pripravljenih vprašanj. Vključuje prehode iz b1.',
        try: 'Pritisni Naprej; ko se pojavi »Napoved«, nariši na graf in pritisni Pokaži.',
        links: [
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?learn=1&ux=b2'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?learn=1&ux=b2'},
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?learn=1&ux=b2'},
        ],
    },
    {
        id: 'b5',
        name: 'Vrt spomina: čez teden dni še veš',
        idea: 'Vsak okvir za opazovanje, ki ga obiščeš, posadi seme. Spomin se vrne po 1, 3, 7, 16 in 35 dneh: lekcija se odpre točno v tistem prizoru, vprašanje čaka, odgovor odkriješ sam in oceniš, koliko si vedel; z vsakim priklicem se odpre en cvet bezgovega kobula.',
        generalizes: 'Kartica je le kazalec na okvir lekcije (pot, lekcija, korak, okvir); prizor zgradi lekcija sama, vprašanje in odgovor pa sta njen poziv in pričakovana opažanja. Vse ostane v brskalniku. Časovni stroj (+1 dan, +1 teden) pokaže razmike takoj.',
        try: 'Na vrtu pritisni »Posadi primere«, nato »Ponovi zdaj«.',
        links: [
            {label: 'Vrt spomina', to: '/bezeg-2.0/ux-lab/spomin'},
            {label: 'Bézier: lekcija, ki sadi', to: '/bezeg-2.0/bezier/curve?learn=1&ux=b5'},
            {label: 'Funkcije: lekcija, ki sadi', to: '/bezeg-2.0/functions/transformations?learn=1&ux=b5'},
        ],
    },
    {
        id: 'b1',
        name: 'Prehodi: graf se premakne, ne preskoči',
        idea: 'Ko greš naprej ali nazaj, graf zdrsne iz prejšnjega prizora v novega: točke drsijo, parametri se zvezno spremenijo, novi elementi se narišejo kot s kredo, stari zbledijo. Učenec vidi, kaj se je spremenilo, namesto da išče razliko med dvema slikama.',
        generalizes: 'Deluje na ravni posnetkov stanja (captureState/restoreState), ki jih ima vsak graf z lekcijo: interpolira vsa števila, diskretne izbire preklopi. Brez kode na lekcijo.',
        try: 'Pritisni Naprej in opazuj graf.',
        links: [
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?learn=1&ux=b1'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?learn=1&ux=b1'},
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?learn=1&ux=b1'},
        ],
    },
    {
        id: 'b3',
        name: 'Sledi: vidiš celo družino krivulj',
        idea: 'Ko vlečeš točko ali premikaš drsnik, prejšnje lege vseh krivulj ostanejo na grafu kot bledeče sledi, kot čebulni papir pri risani animaciji. Začetna oblika ostane črtkana, z »Ohrani sledi« pa učitelj pusti celo pahljačo na tabli.',
        generalizes: 'Posluša posodobitve plošče JSXGraph med učenčevo interakcijo in klonira narisane krivulje; ne pozna nobenega grafa posebej.',
        try: 'Primi točko ali drsnik in ga premikaj.',
        links: [
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?ux=b3'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?ux=b3'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b3'},
        ],
    },
];

export function UxLabPage() {
    return <main className="uxlab">
        <header className="uxlab-head">
            <p className="uxlab-kicker">UX laboratorij · pas B</p>
            <h1>Ko se zasveti</h1>
            <p className="uxlab-lede">Prototipi, ki izhajajo iz učenčeve glave: trenutek, ko nekaj klikne, kako lekcija pripelje do njega, kako učenec ve, da razume, in kako si zapomni še čez teden dni. Vsak prototip vklopi zastavica <code>?ux=</code>; ista povezava brez nje je današnja aplikacija.</p>
            <p className="uxlab-all">Vse skupaj v eni lekciji: <Link to="/bezeg-2.0/functions/transformations?learn=1&ux=b1,b2,b3,b5" reloadDocument>lekcija s prehodi, napovedjo, sledmi in vrtom</Link> · <Link to="/bezeg-2.0/bezier/curve?ux=b3,b4,b6,b7" reloadDocument>graf z izzivom, pahljačo, rentgenom in sledmi</Link> · <Link to="/bezeg-2.0/analysis/taylor?learn=1&ux=b1,b12,b13,b14,b15" reloadDocument>lekcija, v kateri je vse vlečljivo: krivulja, besedilo, predogled in roka</Link></p>
        </header>
        <ol className="uxlab-list">
            {PROTOTYPES.map((prototype, index) => <li key={prototype.id} className="uxlab-card">
                <div className="uxlab-card-head">
                    <span className="uxlab-rank">{index + 1}</span>
                    <h2>{prototype.name}</h2>
                    <code className="uxlab-flag">ux={prototype.id}</code>
                </div>
                <p>{prototype.idea}</p>
                <p className="uxlab-why"><strong>Zakaj velja splošno.</strong> {prototype.generalizes}</p>
                {prototype.try && <p className="uxlab-try">{prototype.try}</p>}
                <ul className="uxlab-links">
                    {prototype.links.map(link => <li key={link.to}>
                        <Link to={link.to} reloadDocument>{link.label}</Link>
                        <Link className="uxlab-compare" to={link.to.replace(/#.*$/, '').replace(/[?&]ux=[^&#]*/, '').replace(/\?$/, '')} reloadDocument>brez</Link>
                    </li>)}
                </ul>
            </li>)}
        </ol>
    </main>;
}
