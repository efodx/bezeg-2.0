# polynomial-zeros-guided

**Naslov:** Ničle polinoma in večkratnost

**Uvod (viden na prvem koraku, prvem okvirju):** Graf polinoma \((x+2)(x-1)^2\) ima dve ničli, a se pri eni prebije skozi os \(x\), pri drugi pa se je le dotakne in se obrne. Zakaj? In ali to lahko vidiš že iz enačbe, še preden narišeš graf?

## Korak 1/7: Ničli, ki se obnašata različno

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ničli, ki se obnašata različno

[besedilo] Narisan je polinom \(p(x)=(x+2)(x-1)^2\). Ob vsaki ničli je oznaka, ki pove njeno večkratnost, torej koliko krat se faktor ponovi v enačbi. Kdor zna to prebrati, lahko graf skicira brez tabele vrednosti.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ničli, ki se obnašata različno

[navodilo za opazovanje] Primerjaj, kaj graf naredi pri ničli \(-2\) in kaj pri ničli \(1\). Ugibaj, kaj je v enačbi pri teh dveh ničlah drugačno.

[skrito pod 'Kaj bi morali opaziti'] Pri \(-2\) graf preide z ene strani osi \(x\) na drugo, pri \(1\) se osi \(x\) le dotakne in ostane nad njo. V enačbi je faktor \(x-1\) kvadriran, faktor \(x+2\) pa ne. Eksponent ob faktorju je večkratnost ničle.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x+2)(x-1)^2\); enojna ničla \(-2\), dvojna ničla \(1\); odvod je skrit.*

## Korak 2/7: Predznak ob ničli

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Predznak ob ničli

[besedilo] Zdaj vemo, da se ničli obnašata različno. Kaj razloži razliko? Vrednost \(p\) je produkt faktorjev, zato se njen predznak spremeni natanko takrat, ko en faktor zamenja predznak. Faktor \(x+2\) je levo od \(-2\) negativen, desno od njega pozitiven.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Predznak ob ničli

[navodilo za opazovanje] Napovej, ali je \(p\) negativen ali pozitiven levo od \(-2\), med \(-2\) in \(1\) ter desno od \(1\). Nato preveri na grafu.

[skrito pod 'Kaj bi morali opaziti'] Levo od \(-2\) je graf pod osjo \(x\), med \(-2\) in \(1\) ter desno od \(1\) pa nad njo. Predznak se spremeni le v \(-2\). Pri \(1\) se ne, ker kvadrat \((x-1)^2\) ni nikoli negativen.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x+2)(x-1)^2\) kot v koraku 1; odvod je skrit.*

## Korak 3/7: Ali položaj ničle kaj spremeni?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ali položaj ničle kaj spremeni?

[besedilo] Morda graf seka os zato, ker je ničla ravno pri \(-2\), dotika pa zato, ker je pri \(1\). To lahko preizkusiš: ničli lahko premikaš, njuni večkratnosti pa ostaneta enaki.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ali položaj ničle kaj spremeni?

[navodilo za opazovanje] Povleci enojno ničlo na več mest, nato še dvojno ničlo. V vrstici »Pravilo« v izpisu Odčitki preberi, kaj graf naredi v vsaki od njiju.

[skrito pod 'Kaj bi morali opaziti'] Kamor koli ju povlečeš, graf enojno ničlo seka, dvojno pa se je dotika. O tem odloča večkratnost, ne položaj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x+2)(x-1)^2\) kot v koraku 1; ničli sta prosto premakljivi; odvod je skrit.*

## Korak 4/7: Zakaj je dotik raven

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Zakaj je dotik raven

[besedilo] Graf se pri dvojni ničli obrne, zato mora biti tam za hip raven. Naklon tangente meri odvod \(p^{\prime}\), ki ga zdaj vidiš kot drugo krivuljo. Kaj bo odvod naredil pri ničli, kjer se graf dotakne osi?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Zakaj je dotik raven

[izračunani primer: Odvod v dvojni ničli, za tiste, ki želijo videti račun]
[izračun] \[p^{\prime}(x)=(x-1)^2+2(x+2)(x-1)=3(x-1)(x+1)\]
[rezultat] \[p^{\prime}(1)=0\]
[preverjanje] Odvod dvojnega faktorja \((x-1)^2\) je \(2(x-1)\), torej v njem ostane faktor \(x-1\) in je v \(x=1\) odvod enak \(0\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Zakaj je dotik raven

[navodilo za opazovanje] Poišči, kje odvod \(p^{\prime}\) seka os \(x\) pri ničli \(1\). Kaj to pove o tangenti na graf \(p\) v tej točki?

[skrito pod 'Kaj bi morali opaziti'] Odvod ima pri \(x=1\) vrednost \(0\), zato je tangenta na graf tam vodoravna: graf ima pri dvojni ničli dno, ki se dotakne osi. Odvod seka os še pri \(x=-1\), a tam \(p\) ni nič, zato to ni ničla, le vrh grafa.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x+2)(x-1)^2\) skupaj z odvodom (druga krivulja); odvod je pri \(x=1\) enak \(0\).*

## Korak 5/7: Kaj pa trojna ničla

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kaj pa trojna ničla

[besedilo] Eksponent \(1\) seka os, eksponent \(2\) se je dotakne. Kaj naredi eksponent \(3\)? Takšno ničlo dobiš, če enojno ničlo prilepiš na dvojno: večkratnosti se seštejeta.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kaj pa trojna ničla

[navodilo za opazovanje] Najprej ugibaj: ali bo graf pri trojni ničli os \(x\) sekal ali se je dotaknil? Nato povleci enojno ničlo \(-2\) na dvojno ničlo \(1\) in poglej oznako ob ničli, krivuljo odvoda ter vrstico »Pravilo« v izpisu Odčitki.

[skrito pod 'Kaj bi morali opaziti'] Ničli se združita v trojno ničlo pri \(1\), polinom je zdaj \((x-1)^3\). Graf os seka, a je tam raven, ker je odvod pri \(1\) enak \(0\). Liha večkratnost seka, višja večkratnost pomeni bolj raven prehod.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Spet \((x+2)(x-1)^2\), odvod viden; učenec sam združi ničli v trojno ničlo.*

## Korak 6/7: Stopnja in konca grafa

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Stopnja in konca grafa

[besedilo] Ničle povedo, kaj se dogaja v sredini grafa. Kaj pa daleč levo in desno? Tam odločata stopnja, ki je vsota večkratnosti, in predznak koeficienta \(k\). Zdaj je narisan polinom \(0{,}2\,(x+3)(x+1)^2(x-2)^2\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Stopnja in konca grafa

[navodilo za opazovanje] Napovej, v kateri od ničel \(-3\), \(-1\) in \(2\) graf seka os in v kateri se je dotakne. Nato v izpisu Odčitki preberi vrstici »Stopnja« in »Obnašanje v neskončnosti« ter ju primerjaj z obema koncema grafa.

[skrito pod 'Kaj bi morali opaziti'] Graf seka os le v \(-3\), v \(-1\) in \(2\) pa se je dotakne. Stopnja je \(1+2+2=5\), liha, zato je levi konec spodaj in desni zgoraj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma stopnje \(5\), \(0{,}2\,(x+3)(x+1)^2(x-2)^2\), z ničlami \(-3\), \(-1\), \(2\); odvod je skrit.*

## Korak 7/7: Graf iz enačbe

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Graf iz enačbe

[besedilo] Zato, ker je faktor \((x-1)^2\) kvadriran in kvadrat ne more biti negativen: predznak \(p\) se ob njem ne spremeni, zato se graf le dotakne osi. Da, iz enačbe se vidi: liha večkratnost seka, soda se dotika, višja je bolj ravna. Stopnja je vsota večkratnosti in pove, kam kažeta konca.

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\) je vodilni koeficient, \(z_i\) so ničle in \(m_i\) njihove večkratnosti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Graf iz enačbe

[navodilo za opazovanje] Izziv: stopnjo \(5\) obdrži, a polinom spremeni tako, da graf os \(x\) seka v treh točkah in se je nikjer ne dotakne. Večkratnosti spreminjaš v poljih »Ničla N: večkratnost« ali pa ničle združuješ z vlečenjem.

[skrito pod 'Kaj bi morali opaziti'] Potrebuješ same lihe večkratnosti z vsoto \(5\): \(1\), \(1\) in \(3\). Graf nato os seka v vseh treh ničlah, v trojni pa je ob tem raven.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Polinom stopnje \(5\) kot v koraku 6, odvod viden; vse je prosto za raziskovanje.*
