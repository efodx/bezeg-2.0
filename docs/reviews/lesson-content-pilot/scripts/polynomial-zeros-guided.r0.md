# polynomial-zeros-guided (lesson script r0)

**Naslov:** Ničle polinoma in večkratnost

**Uvod (viden na prvem koraku, prvem okvirju):** Polinom v produktni obliki \(p(x)=k\,(x-z_1)^{m_1}\cdots(x-z_r)^{m_r}\) ima ničle \(z_i\) z večkratnostmi \(m_i\). Pri lihi večkratnosti graf os \(x\) seka, pri sodi se je dotika; večja ko je večkratnost, bolj raven je graf v ničli, in odvod je v vsaki ničli večkratnosti vsaj \(2\) enak \(0\). Stopnja je vsota večkratnosti; sodost stopnje in predznak \(k\) določata obnašanje grafa za velike \(|x|\), presečišče z osjo \(y\) pa je \(p(0)=k\prod(-z_i)^{m_i}\).

## Korak 1/7: Ničle in predznaki

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ničle in predznaki

[besedilo] Polinom je \(p(x)=(x+2)(x-1)^2\), torej \(k=1\), enojna ničla \(-2\) in dvojna ničla \(1\). Premakni ničli in si zamisli, kako se predznak spreminja od leve proti desni, nato preveri na grafu. Faktor \((x-1)^2\) ni nikoli negativen, zato predznak \(p\) določa le faktor \(x+2\).

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}(x-z_2)^{m_2}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\ne0\) je vodilni koeficient, \(z_i\) so ničle, \(m_i\) pa njihove večkratnosti (tu \(1\), \(2\) ali \(3\)); stopnja je \(m_1+\dots+m_r\le5\).

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ničle in predznaki

[navodilo za opazovanje] Napovej predznak levo od \(-2\), med \(-2\) in \(1\) ter desno od \(1\), nato preveri.

[skrito pod 'Kaj bi morali opaziti'] Levo od \(-2\) je graf pod osjo \(x\), med \(-2\) in \(1\) ter desno od \(1\) pa nad njo; predznak se spremeni le v \(-2\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x+2)(x-1)^2\); enojna ničla \(-2\), dvojna \(1\); odvod je skrit.*

## Korak 2/7: Enojna ničla seka

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Enojna ničla seka

[besedilo] Enojno ničlo smo premaknili z \(-2\) na \(-3\), tako da je \(p(x)=(x+3)(x-1)^2\). Faktor \(x+3\) zamenja predznak v \(-3\), zato graf v \(x=-3\) os \(x\) seka, v \(x=1\) pa se je še vedno dotika. Premik ničle ne spremeni njene večkratnosti.

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}(x-z_2)^{m_2}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\ne0\) je vodilni koeficient, \(z_i\) so ničle, \(m_i\) pa njihove večkratnosti (tu \(1\), \(2\) ali \(3\)); stopnja je \(m_1+\dots+m_r\le5\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Enojna ničla seka

[navodilo za opazovanje] Povleci enojno ničlo in preveri, da graf vedno seka os \(x\) v njej.

[skrito pod 'Kaj bi morali opaziti'] V enojni ničli \(-3\) graf preide s spodnje strani osi \(x\) na zgornjo, v dvojni ničli \(1\) pa ostane nad osjo.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Premaknjena ničla: graf polinoma \((x+3)(x-1)^2\), enojna ničla \(-3\), dvojna \(1\); odvod skrit.*

## Korak 3/7: Dvojna ničla se dotika

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Dvojna ničla se dotika

[besedilo] Spet je \(p(x)=(x+2)(x-1)^2=x^3-3x+2\), odvod \(p^{\prime}\) pa je prikazan. Ker je \(p^{\prime}(x)=3x^2-3\), je \(p^{\prime}(1)=0\) in \(p^{\prime\prime}(1)=6>0\): v dvojni ničli \(x=1\) je tangenta vodoravna, graf se osi \(x\) dotakne od zgoraj in ostane nad njo. Odvod je \(0\) tudi v \(x=-1\), a tam \(p(-1)\ne0\), zato to ni ničla.

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}(x-z_2)^{m_2}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\ne0\) je vodilni koeficient, \(z_i\) so ničle, \(m_i\) pa njihove večkratnosti (tu \(1\), \(2\) ali \(3\)); stopnja je \(m_1+\dots+m_r\le5\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Dvojna ničla se dotika

[izračunani primer: Odvod v dvojni ničli \(x=1\)]
[izračun] \[p^{\prime}(1)=3\cdot1^2-3\]
[rezultat] \[0\]
[preverjanje] Iz \(p(x)=x^3-3x+2\) sledi \(p^{\prime}(x)=3x^2-3=3(x-1)(x+1)\), zato je \(p^{\prime}(1)=0\). Drugi odvod \(p^{\prime\prime}(x)=6x\) je v \(x=1\) enak \(6>0\): graf se osi \(x\) dotakne od zgoraj in ima tam lokalni minimum. Odvod ima ničlo tudi pri \(x=-1\), ki ni ničla polinoma \(p\): to je lokalni maksimum.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Dvojna ničla se dotika

[navodilo za opazovanje] Poišči, kje prikazani odvod seka os \(x\), in preveri, katera od teh točk je ničla polinoma.

[skrito pod 'Kaj bi morali opaziti'] Odvod seka os \(x\) v \(-1\) in v \(1\); le \(x=1\) je ničla polinoma, dvojna, in tam se graf dotakne osi \(x\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Spet \((x+2)(x-1)^2\), a odvod je zdaj viden (druga krivulja); pri dvojni ničli \(1\) ima odvod vrednost \(0\).*

## Korak 4/7: Trojna ničla seka ravno

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Trojna ničla seka ravno

[besedilo] Polinom je \(p(x)=(x-1)^3\): ena ničla \(1\) z večkratnostjo \(3\). Do njega pridemo tudi iz prejšnjega primera: če enojno ničlo povlečeš na dvojno, se ničli združita v trojno ničlo (njuni večkratnosti se seštejeta) in pojasnilo to objavi. Liha večkratnost pomeni, da graf os \(x\) seka, večkratnost več kot \(1\) pa, da je odvod tam enak \(0\): \(p^{\prime}(x)=3(x-1)^2\), \(p^{\prime}(1)=0\). Tangenta je vodoravna, graf os seka in ima v \(x=1\) prevoj.

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}(x-z_2)^{m_2}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\ne0\) je vodilni koeficient, \(z_i\) so ničle, \(m_i\) pa njihove večkratnosti (tu \(1\), \(2\) ali \(3\)); stopnja je \(m_1+\dots+m_r\le5\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Trojna ničla seka ravno

[navodilo za opazovanje] Primerjaj graf okoli \(x=1\) z grafom dvojne ničle: ali ostane graf na isti strani osi \(x\)?

[skrito pod 'Kaj bi morali opaziti'] Graf preide od spodaj navzgor skozi \(x=1\), tam je raven in ima vodoravno tangento; odvod se v \(1\) dotakne osi \(x\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x-1)^3\) s trojno ničlo \(1\); odvod viden.*

## Korak 5/7: Stopnja in konca grafa

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Stopnja in konca grafa

[besedilo] Polinom je \(p(x)=0{,}2\,(x+3)(x+1)^2(x-2)^2\) s tremi ničlami z večkratnostmi \(1\), \(2\) in \(2\): stopnja je \(1+2+2=5\), največja dovoljena. Za velike \(|x|\) prevlada vodilni člen \(0{,}2\,x^5\). Ker je \(k=0{,}2>0\) in je stopnja liha, gre \(p(x)\to-\infty\) za \(x\to-\infty\) in \(p(x)\to+\infty\) za \(x\to+\infty\). Pri sodi stopnji bi bila konca na isti strani.

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}(x-z_2)^{m_2}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\ne0\) je vodilni koeficient, \(z_i\) so ničle, \(m_i\) pa njihove večkratnosti (tu \(1\), \(2\) ali \(3\)); stopnja je \(m_1+\dots+m_r\le5\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Stopnja in konca grafa

[navodilo za opazovanje] Poišči, katera ničla seka os \(x\) in kateri se je graf le dotakne, ter preveri konca grafa.

[skrito pod 'Kaj bi morali opaziti'] Graf seka os \(x\) le v \(-3\) in se je dotika v \(-1\) in \(2\); levi konec je spodaj, desni zgoraj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma stopnje \(5\), \(0{,}2\,(x+3)(x+1)^2(x-2)^2\), z ničlami \(-3\), \(-1\), \(2\); odvod skrit.*

## Korak 6/7: Presečišče z osjo \(y\)

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Presečišče z osjo \(y\)

[besedilo] Za \(p(x)=(x+2)(x-1)^2\) je \(p(0)=k\prod(-z_i)^{m_i}=1\cdot2^1\cdot(-1)^2=2\). Graf torej seka os \(y\) v \((0,2)\). Račun ne potrebuje razvoja: vsaka ničla prispeva \((-z_i)^{m_i}\), pri sodi večkratnosti vedno nenegativno število.

[formula/oznake] \[p(0)=k\prod_i(-z_i)^{m_i}\]

[formula/oznake] Vrednost v \(x=0\) je presečišče grafa z osjo \(y\); \(z_i\) so ničle in \(m_i\) njihove večkratnosti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Izračun)

[naslov okvirja] Presečišče z osjo \(y\)

[izračunani primer: Presečišče z osjo \(y\) polinoma \((x+2)(x-1)^2\)]
[izračun] \[1\cdot(0+2)^1\cdot(0-1)^2\]
[rezultat] \[2\]
[preverjanje] Ničli sta \(z_1=-2\) z \(m_1=1\) in \(z_2=1\) z \(m_2=2\), \(k=1\): \(1\cdot2^1\cdot(-1)^2=2\). Preverimo z razvojem \((x+2)(x-1)^2=x^3-3x+2\), ki ima v \(x=0\) vrednost \(2\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Opazovanje)

[naslov okvirja] Presečišče z osjo \(y\)

[navodilo za opazovanje] Preberi presečišče z osjo \(y\) z grafa in ga primerjaj z izračunanim.

[skrito pod 'Kaj bi morali opaziti'] Prikazano presečišče z osjo \(y\) je \(p(0)=2\), enako kot izračun \(1\cdot2\cdot1\).

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Spet \((x+2)(x-1)^2\), odvod skrit; vidno je presečišče z osjo \(y\) pri \(p(0)=2\).*

## Korak 7/7: Prosto raziskovanje

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Prosto raziskovanje

[besedilo] Prikazan je polinom \(0{,}2\,(x+3)(x+1)^2(x-2)^2\) z odvodom; vse je prosto. Povleci ničle, vpiši njihov položaj s številom, združi dve ničli (večkratnost več kot \(3\) ali stopnja več kot \(5\) ni dovoljena in program navede razlog) in vsakič preveri: liha večkratnost seka, soda se dotika, odvod je v ničli večkratnosti vsaj \(2\) enak \(0\).

[formula/oznake] \[p(x)=k\,(x-z_1)^{m_1}(x-z_2)^{m_2}\cdots(x-z_r)^{m_r}\]

[formula/oznake] \(k\ne0\) je vodilni koeficient, \(z_i\) so ničle, \(m_i\) pa njihove večkratnosti (tu \(1\), \(2\) ali \(3\)); stopnja je \(m_1+\dots+m_r\le5\).

[formula/oznake] \[p(0)=k\prod_i(-z_i)^{m_i}\]

[formula/oznake] Vrednost v \(x=0\) je presečišče grafa z osjo \(y\); \(z_i\) so ničle in \(m_i\) njihove večkratnosti.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Prosto raziskovanje

[navodilo za opazovanje] Poskusi dvojno ničlo \(2\) povleči na dvojno ničlo \(-1\). Nato povleci enojno ničlo \(-3\) na \(-1\) in preveri, kaj se zgodi z večkratnostjo in stopnjo.

[skrito pod 'Kaj bi morali opaziti'] Združitev dveh dvojnih ničel bi dala večkratnost \(4\), zato je zavrnjena z razlogom in graf ostane enak. Enojna in dvojna ničla pa se združita v trojno ničlo pri \(-1\), kjer graf seka os \(x\) ravno, stopnja ostane \(5\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Polinom stopnje \(5\) kot v koraku 5, odvod viden; vse je prosto za raziskovanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
