# curve-curvature-guided

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Krivulja na grafu se na enem koncu zavije ostro, na drugem komaj kaj. Zakaj je tako in kako to izmeriš z enim številom?

## Korak 1/5: Kateri konec je bolj zavit?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec je bolj zavit?

[besedilo] Ukrivljenost \(\kappa\) je število, ki pove, kako hitro krivulja spreminja smer, ko greš po njej. Na cestah in železniških progah se mora spreminjati postopoma, sicer bi avto ali vlak sunkovito zaneslo vstran. Zelena točka na krivulji leži pri parametru \(t\): pri \(t=0\) je v začetni točki \(p_0\), pri \(t=1\) v končni točki \(p_3\). Njeno \(\kappa\) kaže izpis zgoraj levo na grafu.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec je bolj zavit?

[navodilo za opazovanje] Kaj misliš, je krivulja bolj zavita na začetku ali na koncu? Nato z drsnikom Parameter t v skupini Uredi nastavi \(t=0\) in \(t=1\) ter obakrat preberi \(\kappa\) v izpisu.

[skrito pod 'Kaj bi morali opaziti'] Začetek je zavit veliko bolj: \(\kappa\) je pri \(t=0\) več kot desetkrat večja kot pri \(t=1\). Ko greš po krivulji, se \(\kappa\) ves čas manjša. Zakaj je tako, odkriješ v tretjem koraku.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, zelena točka pri \(t=0{,}5\); izpis zgoraj levo kaže \(\kappa\); puščici \(T\), \(N\) in krivinska krožnica so skrite.*

## Korak 2/5: Krožnica, ki se prilega

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krožnica, ki se prilega

[besedilo] Zdaj veš, da je začetek bolj zavit. To lahko tudi vidiš. Oranžna črtkana krožnica se krivulji v zeleni točki prilega najbolje od vseh krožnic: to je krivinska krožnica, njen polmer \(R\) pa krivinski polmer. Zelena puščica \(T\) kaže, kam krivulja teče, modra črtkana puščica \(N\) je pravokotna nanjo. Polmer je obratna vrednost ukrivljenosti:

[formula/oznake] \[R=\frac{1}{|\kappa|}\]

[formula/oznake] Navpični črti pomenita absolutno vrednost, zato je polmer vedno pozitiven.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krožnica, ki se prilega

[navodilo za opazovanje] Ugani, kaj se zgodi s krožnico, ko \(t\) narašča od \(0\) do \(1\). Preveri z drsnikom Parameter t in opazuj krožnico ter vrstico \(R\) v izpisu zgoraj levo.

[skrito pod 'Kaj bi morali opaziti'] Krožnica se veča, dokler ne seže daleč čez rob grafa; pri \(t=1\) je \(R\approx16{,}8\). Majhna krožnica pomeni oster zavoj, velika pa skoraj raven kos.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista kubična krivulja, zelena točka pri \(t=0\); vidni sta puščici \(T\) in \(N\) ter krivinska krožnica.*

## Korak 3/5: Kaj odloči o zavoju na začetku?

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kaj odloči o zavoju na začetku?

[besedilo] Zakaj pa je začetek tako bolj zavit? Krivulja iz \(p_0\) najprej krene proti \(p_1\). Kako hitro jo nato \(p_2\) odvleče s te smeri, je odvisno od dveh stvari: kako daleč je \(p_2\) od premice skozi \(p_0\) in \(p_1\) in kako kratka je stranica \(p_0p_1\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Kaj odloči o zavoju na začetku?

[navodilo za opazovanje] Napovej, kaj se zgodi s \(\kappa\) pri \(t=0\), če kontrolno točko \(p_2\) povlečeš navzgor dvakrat dlje od vodoravne osi. Preveri v izpisu, nato povleci še \(p_3\) kamor koli.

[skrito pod 'Kaj bi morali opaziti'] Ko se razdalja \(p_2\) od osi podvoji, se podvoji tudi \(\kappa\) pri \(t=0\), na približno \(1{,}33\). Točka \(p_3\) pa na zavoj na začetku sploh ne vpliva: tam odločajo le \(p_0\), \(p_1\) in \(p_2\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Kaj odloči o zavoju na začetku?

[izračunani primer: Za tiste, ki želijo videti račun: ukrivljenost v krajiščih]
[izračun] \[\kappa(0)=\frac23\cdot\frac{h}{a^{2}}=\frac23\cdot\frac{1}{1^{2}}=\frac23\]
[rezultat] \[\kappa(0)\approx0{,}6667\]
[preverjanje] Pri kubični krivulji je \(a\) dolžina stranice \(p_0p_1\), \(h\) pa razdalja točke \(p_2\) od premice \(p_0p_1\); pri izhodiščnih točkah je \(a=1\) in \(h=1\). Na koncu vzameš stranico \(p_2p_3\) z dolžino \(a=\sqrt5\) in razdaljo \(h=1/\sqrt5\) točke \(p_1\) od njene premice, pa dobiš \(\kappa(1)=\tfrac{2}{15\sqrt5}\approx0{,}0596\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, zelena točka pri \(t=0\); vidni sta puščici \(T\) in \(N\) ter krivinska krožnica.*

## Korak 4/5: Ko se zavoj obrne

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ko se zavoj obrne

[besedilo] Doslej je krivulja ves čas zavijala v isto smer. Ta ima obliko črke S: najprej zavije v eno smer, nato v drugo. Na cesti je to mesto, kjer volan preide iz enega zavoja v drugega. Zelena točka je zdaj točno na sredini.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ko se zavoj obrne

[navodilo za opazovanje] Kaj misliš, kaj pokaže izpis \(\kappa\) in kje bo krožnica malo pred sredino in malo za njo? Z drsnikom Parameter t nastavi \(t\) malo pod \(0{,}5\) in malo nad \(0{,}5\).

[skrito pod 'Kaj bi morali opaziti'] Na sredini je \(\kappa=0\) in izpis javi, da je krivinska krožnica premica. Pred sredino je \(\kappa\) negativna, za njo pozitivna, krožnica pa preskoči na drugo stran krivulje; modra puščica \(N\) ostane na levi. Predznak pove smer zavoja: plus za levo, minus za desno, gledano v smeri puščice \(T\). Taki točki pravimo prevoj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja v obliki črke S, zelena točka pri \(t=0{,}5\); vidni sta puščici \(T\) in \(N\), namesto krožnice je premica, izpis javi, da je ukrivljenost 0.*

## Korak 5/5: Zakaj je začetek bolj zavit

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zakaj je začetek bolj zavit

[besedilo] Zato, ker o zavoju v krajišču odločajo le tri kontrolne točke ob njem. Na začetku je stranica \(p_0p_1\) kratka, \(p_2\) pa daleč od njene premice, zato je zavoj oster. Na koncu je stranica \(p_2p_3\) dolga, \(p_1\) pa blizu njene premice, zato je zavoj blag. Izmeriš ga z ukrivljenostjo \(\kappa\): večja ko je, manjša je krivinska krožnica.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zakaj je začetek bolj zavit

[navodilo za opazovanje] Izziv: premakni kontrolne točke tako, da bo krivulja na obeh koncih enako zavita. Preveri z drsnikom Parameter t pri \(t=0\) in \(t=1\).

[skrito pod 'Kaj bi morali opaziti'] Uspe, ko je kontrolni poligon zrcalno simetričen: zadnja stranica je enako dolga kot prva in \(p_1\) je od njene premice enako daleč kot \(p_2\) od premice prve. Najhitreje gre tako, da \(p_3\) povlečeš naravnost nad \(p_2\), za toliko, kolikor je \(p_1\) desno od \(p_0\). Takrat izpis na obeh koncih pokaže \(\kappa\approx0{,}6667\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Izhodiščna kubična krivulja, zelena točka pri \(t=0\); vidni sta puščici \(T\) in \(N\) ter krivinska krožnica; vse točke so proste za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
