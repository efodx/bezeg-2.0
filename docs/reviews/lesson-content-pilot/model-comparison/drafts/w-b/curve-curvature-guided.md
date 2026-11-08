# curve-curvature-guided

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Začetek te krivulje se zavije dosti bolj kot konec. Zakaj, in kako to izmerimo s številom? Isto število uporabljajo pri načrtovanju cest, tirov in poti animacij.

## Korak 1/5: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Pri cestah in tirih je pomembno, kako oster je ovinek. Na grafu je krivulja, ki se na začetku zavija drugače kot na koncu. Koliko se zavije v dani točki, pove število, ukrivljenost \(\kappa\). Odčitaš jo v izpisu v zgornjem levem kotu grafa.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Ugibaj: kje je krivulja bolj zavita, pri \(t=0\) ali pri \(t=1\)? Nato z drsnikom Parameter \(t\) preberi ukrivljenost na obeh koncih.

[skrito pod 'Kaj bi morali opaziti'] Na začetku. Pri \(t=0\) je \(\kappa\approx0{,}67\), pri \(t=1\) pa dosti manj. Večja ukrivljenost pomeni ostrejši ovinek.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja z označeno točko pri \(t=0{,}5\); izpis kaže ukrivljenost. Okvir \(T\), \(N\) in krožnica sta skrita.*

## Korak 2/5: Ukrivljenost kot krožnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ukrivljenost kot krožnica

[besedilo] Začetek je torej bolj zavit. Kako si to predstavljati? V vsaki točki se krivulji najbolje prilega ena krožnica, imenovana krivinska krožnica. Njen polmer je \(R=1/|\kappa|\): ostrejši ovinek pomeni manjšo krožnico.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ukrivljenost kot krožnica

[navodilo za opazovanje] Poglej črtkano krožnico pri \(t=0\). Ugibaj: kaj se bo z njo zgodilo, ko drsnik \(t\) počasi premakneš proti 1? Preveri.

[skrito pod 'Kaj bi morali opaziti'] Krožnica raste, polmer \(R\) v izpisu se veča. Pri \(t=1\) je več kot desetkrat večji kot pri \(t=0\), zato je konec dosti bolj raven.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Točka se prestavi na \(t=0\); pokaže se črtkana krivinska krožnica s središčem. Okvir \(T\), \(N\) ostane skrit.*

## Korak 3/5: Kaj določa ovinek

### Okvir 1 od 3 (Razlaga)

[naslov okvirja] Kaj določa ovinek

[besedilo] Zakaj je krožnica na začetku tako majhna? Odgovor je v kontrolnih točkah. Začetek krivulje oblikujejo predvsem \(p_0\), \(p_1\) in \(p_2\). Točka \(p_2\) leži nad premico skozi \(p_0\) in \(p_1\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 3 (Opazovanje)

[naslov okvirja] Kaj določa ovinek

[navodilo za opazovanje] Ugibaj: kaj se zgodi z \(\kappa\) pri \(t=0\), če povlečeš \(p_2\) višje? Povleci \(p_2\) navzgor in navzdol ter spremljaj izpis. Nato poskusi še s \(p_3\).

[skrito pod 'Kaj bi morali opaziti'] Višje ko je \(p_2\) nad to premico, večja je \(\kappa\) pri \(t=0\); dvakrat višje pomeni dvakrat večjo. Premik \(p_3\) začetka sploh ne spremeni.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 3 od 3 (Izračun)

[naslov okvirja] Kaj določa ovinek

[izračunani primer: Račun za tiste, ki ga želijo videti]
[izračun] \[\kappa(0)=\frac{n-1}{n}\cdot\frac{h}{a^{2}}=\frac{3-1}{3}\cdot\frac{1}{1^{2}}\]
[rezultat] \[\kappa(0)=\frac23\approx0{,}6667\]
[preverjanje] Tu je \(n=3\) stopnja krivulje, \(a=1\) dolžina daljice od \(p_0\) do \(p_1\) in \(h=1\) višina točke \(p_2\) nad njeno premico. Izpis pri \(t=0\) pokaže isto vrednost.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ista krivulja kot prej, točka pri \(t=0\), krivinska krožnica vidna.*

## Korak 4/5: Ovinek v obe smeri

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ovinek v obe smeri

[besedilo] Doslej se je krivulja zavijala le v eno smer. Na grafu je krivulja v obliki črke S: najprej zavije v eno smer, nato v drugo. Kakšna je ukrivljenost tam, kjer se smer obrne?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ovinek v obe smeri

[navodilo za opazovanje] Ugibaj: pri katerem \(t\) je ukrivljenost ničelna? Nato premikaj drsnik \(t\) in poišči mesto, kjer se krožnica spremeni v premico.

[skrito pod 'Kaj bi morali opaziti'] Na sredini, pri \(t=0{,}5\). Tam je namesto krožnice premica, krivinski polmer je neskončen in izpis to napove. Pred tem mestom in za njim je krožnica na nasprotnih straneh krivulje. Mestu pravimo prevoj.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Krivulja v obliki črke S (kontrolne točke so postavljene tako, da je prevoj natanko pri \(t=0{,}5\)), točka pri \(t=0{,}2\); krivinska krožnica je vidna.*

## Korak 5/5: Zato je začetek bolj zavit

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zato je začetek bolj zavit

[besedilo] Zato, ker je na začetku prva stranica kontrolnega poligona kratka, točka \(p_2\) pa daleč od nje; na koncu je zadnja stranica daljša, točka \(p_1\) pa blizu njene premice. Ukrivljenost \(\kappa\) ovinek izmeri s številom, krivinska krožnica pa kot krog. Kjer se krivulja obrne iz ene smeri v drugo, je \(\kappa=0\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zato je začetek bolj zavit

[navodilo za opazovanje] Poskusi narediti začetek čim ostrejši: pri \(t=0\) naj bo krivinska krožnica čim manjša. Katera dva premika potrebuješ?

[skrito pod 'Kaj bi morali opaziti'] Točko \(p_1\) potisni bliže \(p_0\), da je prva stranica krajša, in točko \(p_2\) višje nad premico skozi \(p_0\) in \(p_1\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Kubična krivulja kot na začetku, točka pri \(t=0\), krivinska krožnica vidna; vse je prosto za premikanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
