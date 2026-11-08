# polynomial-zeros-guided

**Naslov:** Ničle polinoma in večkratnost

**Uvod (viden na prvem koraku, prvem okvirju):** Graf polinoma \((x+2)(x-1)^2\) ima dve ničli. V eni os \(x\) seka, v drugi se je le dotakne. Zakaj? Ali to vidiš že iz zapisa, še preden narišeš graf? Tako beremo graf tudi v programih za risanje funkcij in pri iskanju rešitev enačb.

## Korak 1/5: Seka ali se dotakne?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Seka ali se dotakne?

[besedilo] Na grafu je polinom \(p(x)=(x+2)(x-1)^2\). Ničla je mesto, kjer graf doseže os \(x\). Ta polinom ima dve: eno pri \(x=-2\) in eno pri \(x=1\). Zakaj pa se graf v teh dveh ničlah obnaša različno?

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Seka ali se dotakne?

[navodilo za opazovanje] Poglej obe ničli v izpisu desno od grafa. Katera ima večkratnost \(1\) in katera \(2\)? Napovej, v kateri graf os \(x\) seka in v kateri se je le dotakne, nato preveri na grafu.

[skrito pod 'Kaj bi morali opaziti'] Pri \(x=-2\) (večkratnost \(1\)) graf os \(x\) seka. Pri \(x=1\) (večkratnost \(2\)) se je le dotakne in ostane nad njo.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x+2)(x-1)^2\); enojna ničla \(-2\), dvojna \(1\); odvod je skrit.*

## Korak 2/5: Zakaj dvojna ničla ne seka

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zakaj dvojna ničla ne seka

[besedilo] Zdaj vemo, da večkratnost nekaj pove. Kaj točno? Polinom je zmnožek faktorjev. Faktor \(x+2\) je negativen levo od \(-2\) in pozitiven desno od njega. Faktor \((x-1)^2\) je kvadrat, zato nikoli ni negativen. Predznak torej določa le prvi faktor.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zakaj dvojna ničla ne seka

[navodilo za opazovanje] Povleci enojno ničlo z \(-2\) na novo mesto, na primer levo ali desno od dvojne ničle. Opazuj, kje graf še vedno seka os \(x\) in kje se je dotika.

[skrito pod 'Kaj bi morali opaziti'] Kamor koli postaviš enojno ničlo, graf v njej os \(x\) seka. V dvojni ničli \(1\) se je še vedno le dotakne, saj kvadrat ne more spremeniti predznaka.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Ničla premaknjena na \(-3\): graf polinoma \((x+3)(x-1)^2\), enojna ničla \(-3\), dvojna \(1\); odvod skrit.*

## Korak 3/5: Kaj se zgodi pri trojni ničli?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kaj se zgodi pri trojni ničli?

[besedilo] Zdaj vemo: liha večkratnost seka, soda se dotakne. Kaj pa večkratnost \(3\)? Faktor \((x-1)^3\) zamenja predznak kot navaden faktor, a ob ničli je veliko bolj raven. Poglej še odvod, drugo krivuljo na grafu: pove, kako strma je prva.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kaj se zgodi pri trojni ničli?

[navodilo za opazovanje] Primerjaj graf okoli \(x=1\) z grafom dvojne ničle iz prejšnjih korakov. Ali graf ostane na isti strani osi \(x\)? Poglej tudi, kje odvod doseže os \(x\).

[skrito pod 'Kaj bi morali opaziti'] Graf preide od spodaj navzgor, torej os seka, a je pri \(x=1\) raven. Odvod se tam dotakne osi \(x\), kar pomeni vodoravno tangento.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma \((x-1)^3\) s trojno ničlo \(1\); odvod viden.*

## Korak 4/5: Konca grafa

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Konca grafa

[besedilo] Vemo, kaj se dogaja ob ničlah. Kaj pa daleč stran od njih? Tam prevlada člen z najvišjo potenco. Stopnja polinoma je vsota večkratnosti. Pri tem polinomu je \(1+2+2=5\), torej liha.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Konca grafa

[navodilo za opazovanje] Poglej skrajno levi in skrajno desni konec grafa. Ali sta na isti strani osi \(x\)? Nato v izpisu poišči ničlo, v kateri graf seka os.

[skrito pod 'Kaj bi morali opaziti'] Levi konec je spodaj, desni zgoraj, ker je stopnja liha. Os \(x\) seka le ničla z večkratnostjo \(1\), v preostalih dveh se graf le dotakne.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Graf polinoma stopnje \(5\), \(0{,}2\,(x+3)(x+1)^2(x-2)^2\), z ničlami \(-3\), \(-1\), \(2\); odvod skrit.*

## Korak 5/5: Preizkusi sam

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Preizkusi sam

[besedilo] Zato, ker je predznak odvisen le od lihih večkratnosti: liha ničla graf prečka, soda ga pusti na isti strani. Ob večkratnosti vsaj \(2\) je graf tam raven. Stopnja je vsota večkratnosti in določa konca grafa. Zdaj preizkusi še, kaj program dovoli.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Preizkusi sam

[navodilo za opazovanje] Poskusi dvojno ničlo \(2\) povleči na dvojno ničlo \(-1\). Nato povleci enojno ničlo \(-3\) na \(-1\). Pred vsakim premikom napovej, kakšna bo večkratnost in kaj bo graf naredil.

[skrito pod 'Kaj bi morali opaziti'] Dve dvojni ničli bi dali večkratnost \(4\), zato program združitev zavrne in navede razlog. Enojna in dvojna ničla pa se združita v trojno ničlo pri \(-1\), kjer graf seka os \(x\) in je raven. Stopnja ostane \(5\).

Za izziv: poskusi zgraditi polinom, ki se osi \(x\) le dotika in nikoli ne preide pod njo.

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Polinom stopnje \(5\) kot v koraku 4, odvod viden; vse je prosto za raziskovanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
