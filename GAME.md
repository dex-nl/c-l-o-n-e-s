# C.L.O.N.E.S

Het spel van Dex (11 jaar).

## Het idee
- Een **avontuur in een wereld**, zoals Zelda of Pokémon.
- **Low-poly 3D**: een wereld van hoekige vlakjes, met echte schaduwen, golvend water en dingen die bewegen (zoals Crossy Road of A Short Hike).
- Spelen op de **iPad**, liggend, met knoppen op het scherm. Ook te spelen op een laptop.
- Dit moet er zeker in: een **clonemachine** waarmee je clones van jezelf kunt maken!

## Wat zit er al in

### Hoofdstuk 1: De clonemachine
- Een dorpje met huizen, een waterput, een vijver met eendjes, vlinders, bomen, bloemen en een hek.
- Professor Bolt, de uitvinder. Zijn clonemachine is kapot: zoek 3 gouden tandwielen.
- Breng de tandwielen terug en hij zet de machine aan. Ga ervoor staan en druk op **Clone!**
- Je clones lopen in een rij achter je aan. Sta je even stil? Dan gaan ze dansen!

### Hoofdstuk 2: Het Slijmbos
- Met 3 clones heeft Professor Bolt slecht nieuws: **Koning Slijm** heeft zijn Superbatterij gestolen!
- Je krijgt een **zwaard** (je clones ook) en de **poort** achter het dorp gaat open.
- **Het Slijmbos**: slijmpjes, paddenstoelen en vuurvliegjes. Slijmpjes laten **kristallen** 💎 en soms een **hartje** vallen.
- Je clones **vechten mee** als er slijmpjes in de buurt komen.
- De **grotdeur** gaat alleen open als er op alle 3 de knoppen iemand staat. (Wie loopt er altijd achter je aan?)
- **De Slijmgrot**: een kerker met vuurschalen en kristallen. Achterin wacht **Koning Slijm**. Pas op voor zijn grote sprong!
- Breng de Superbatterij terug naar Professor Bolt: dan kan de machine **10 clones** maken.

### Hoofdstuk 3: De Grote Woestijn (idee van Dex!)
- De zandkleurige **woestijnpoort** aan de **westkant van het dorp** verschijnt pas (met glitters en de melding *"Er is een nieuwe poort verschenen!"*) als **De Stad uitgespeeld** is: je hebt alle **4 klusjes van Burgemeester Bert** gedaan (zie hieronder). Dat staat op één plek: `isCityDone` in `js/quest.js`. Had je in een oude save de poort al (je had een auto gekocht of was al in de woestijn)? Dan houd je hem.
- De poort gaat open als je hoofdstuk 2 hebt uitgespeeld én Professor Bolt je over het eerste stukje van de **schatkaart** heeft verteld (de schat van de piraat uit het boek *De verborgen schat*).
- **De Grote Woestijn** is **heel groot** (ruim 3 keer zo groot als De Grote Stad): duinen waar je omheen moet, **cactussen**, stenen paden met wegwijzers, een **oase** met palmbomen en **Kameel Karel** (hij geeft tips), **Sfinx Sam** (een reuzenkat van steen), ruïnes en **piramides**.
- Overal **mummieslijmpjes**: slijmpjes in wc-papier, sterker en sneller dan de slijmpjes in het bos. Je clones vechten mee.
- Af en toe een **zandstorm** 🌪️: de lucht wordt geel, zand vliegt voorbij en de wind duwt je een beetje opzij. Geen pijn, hij waait vanzelf weer over.
- Puzzel: sla de 3 **zonnestenen** met je zwaard (bij de Oude Ruïne, de Kleine Piramide en de Vergeten Tempel). Een gouden lichtstraal laat zien welke al schijnen. Schijnen ze alle 3? Dan gaat de deur van de **Grote Piramide** open (helemaal achterin, ver van de poort).
- **In de Grote Piramide**: gangen met fakkels, vazen, een sarcofaag, hiërogliefen op de muren en meer mummieslijmpjes.
- In de troonzaal woont de baas: **Schorpioen Sjors** 🦂 (grote ogen, roze wangetjes, een rood hoedje). Hij knijpt met zijn scharen, stampt met zijn staart (kijk naar de ring op de grond) en als hij boos wordt graaft hij zich in en springt hij onder je vandaan omhoog (kijk naar de schaduw!).
- Versla hem en je krijgt het **1e stukje van de schatkaart** (1 van 10). Breng het naar Professor Bolt. Je kunt de schatkaart altijd bekijken in je **rugzak**.
- Woestijn en piramide zijn **moeilijker** dan het bos: mummieslijmpjes hebben meer leven (6), zijn sneller, er staan er meer bij de zonnestenen en er vallen minder hartjes. Sjors heeft **48 levens** en als hij boos wordt zwaait hij ook met zijn staart.

### Hoofdstuk 4: Het Doolhof (idee van Dex!)
- Heb je het stukje van Sjors gepakt? Dan verschijnt in de woestijn, **naast de Grote Piramide**, een groene poort (met glitters en *"Er is een nieuwe poort verschenen!"*). Op de kaart staat **Het Doolhof**.
- **Het Doolhof** is een groot doolhof van hoge heggen (15 bij 15 vakjes). De camera kijkt van boven, en heggen tussen jou en de camera worden doorzichtig, zodat je jezelf altijd ziet.
- **De kaart** laat alleen zien waar je al geweest bent. Het spel onthoudt het.
- **3 gekleurde deuren** (rood, blauw, geel) op de weg naar het midden. Elke deur heeft knoppen ergens in een doodlopend gangetje: rood en blauw hebben er 2, geel heeft er 3. Ga op een knop staan: dan lopen je clones naar de andere knoppen. Te weinig clones? *"Er zijn 3 knoppen... Je hebt 2 clones nodig!"* Clones weg (👻)? *"Je clones zijn weg! Haal ze terug, dan kunnen ze helpen."*
- **Vallen**: doornen in de grond (eerst een rood vlak als waarschuwing) en **rollende rotsen** in lange gangen. Ze kosten 1 hartje.
- **8 schatkisten** in doodlopende gangetjes (kristallen) en **3 kristalbloemen**: raak er een aan en 30 seconden lang wijzen glinsters de weg naar je volgende doel.
- Veel **heggenslijmpjes** (sterker dan de mummies).
- In het midden woont **Bladkoning Bram** 🍃: een heel groot, vriendelijk bladerslijm met een kroon en een snor. Hij is taai (**72 levens**). Hij springt en landt met een klap (1 hartje, als hij boos is 2; kijk naar de schaduw), maakt een **doornenkrans** (rode ring: ga eruit, heel dichtbij of ver weg) en roept heggenslijmpjes (die geven altijd een hartje). Bij de helft wordt hij boos. Samen met je clones kun je hem verslaan!
- Dan krijg je **stukje 2 van 10** van de schatkaart. Breng het naar Professor Bolt: *"Hoofdstuk 4 uitgespeeld!"* Wordt vervolgd...

### Meer clones 🧬
- Linksboven zie je hoeveel clones je hebt: **🧬 Clones 3/10**.
- Elk stukje schatkaart geeft **1 clone meer**: *"🧬 Je kunt nu 1 clone meer maken!"*
- De getallen: aan het begin 5, met de Superbatterij 10, met stukje 1 = 11, stukje 2 = 12, ... alle 10 stukjes = 20.

### Moeilijkheid
- Elke nieuwe wereld is een beetje moeilijker. Dat staat op één plek: `js/difficulty.js` (bos 1, woestijn 2, piramide 2,2, doolhof 3). Slijmpjes krijgen meer leven en zijn iets sneller, bazen slaan harder en er vallen minder hartjes. Met je clones blijft het altijd te halen.

### Samen spelen 🤝 (idee van Dex!)
- Rechtsboven zit de knop **🤝 Samen spelen** (op een iPhone alleen 🤝). Daar kies je:
  - **✨ Code maken**: je krijgt een korte code, zoals **BOS-4821**. Zeg hem tegen je vriend of laat hem zien.
  - **⌨️ Code invoeren**: typ de code van je vriend en druk op **Meedoen** (hoofdletters, spaties en het streepje maken niet uit).
- Je kunt met **maximaal 4 spelers** samen spelen. Komt er nog iemand bij? Die hoort *"Dit spel is vol"*.
- Je ziet elkaar als poppetje met een **eigen kleur** en een **naamkaartje** (*Speler 1*, *Speler 2*, ...). Rijdt of vliegt je vriend? Dan zie je zijn auto.
- Je ziet alleen de spelers die in **dezelfde wereld** zijn als jij. Ga samen naar het bos, de stad of de woestijn!
- Linksboven staat bijvoorbeeld *"🤝 Verbonden met 1 vriend"*. Met **🔌 Stoppen met samen spelen** ben je weer alleen.
- Foute code? *"Code niet gevonden"*. Valt de verbinding weg? Dan krijg je een melding en speel je gewoon alleen verder.
- Iedereen houdt zijn **eigen** save: kristallen, spullen, codes en voortgang worden niet gedeeld. Er is geen chat.

### Clones even weg 👻
- Vind je je clones soms in de weg lopen? Tik op de knop **👻 Clones weg** rechtsboven (naast de kaart; op een iPhone alleen 👻), of druk op **H** (de C is al voor clonen). Je clones zijn even weg: onzichtbaar, ze volgen niet, botsen niet en vechten niet. Nog een keer (**🧬 Clones terug**) en ze staan meteen weer achter je. Maak je een nieuwe clone, dan komen ze ook terug. Het spel onthoudt het. Werkt overal, ook in je auto.

### Geheim! 🤫 (niet verklappen in het spel)
- Er is een **geheime code** die je **100 kristallen** geeft, maar één keer per save.
- **Waar staat de code?** Diep in de **Grote Piramide**: in de grote hal ga je links (west) een smal doodlopend gangetje in, langs een vaas, helemaal naar het eind. Daar hangt een **oude muur met tekens**. Lees hem (sta er vlak voor) en je ziet: `KRISTAL100`.
- **Waar typ je de code?** Tik (of klik) **5 keer snel** (binnen 2,5 seconde) op je **kristallen** 💎 linksboven. Dan komt er een vakje.
- Foute code: *"Die code klopt niet."* Al gebruikt: *"Deze code heb je al gebruikt!"*
- Er is ook een **geheime auto-code**: die zet de **Wolkenflitser gratis** voor je klaar (zo vaak je wilt, hoofdletters maken niet uit). Ben je in De Stad? Dan staat hij meteen naast je. Ben je ergens anders (daar kun je niet rijden)? Dan wacht hij bij de ingang van De Stad: *"De Wolkenflitser staat voor je klaar in De Stad!"*. Ook deze code staat nergens opgeschreven (alleen een hash). Zit je al in een auto? Dan eerst uitstappen.
- Er is een **supergeheime code** die je **100.000 kristallen** geeft (één keer per save). Hij is heel goed verstopt en er zijn **geen hints** in het spel. Zo vind je hem:
  1. **Steentje 1 (KRIS)**: in de **woestijn**, een paar stappen ten noordoosten van Sfinx Sam (de reuzenkat), ligt een klein steentje in het zand (op ongeveer x 29,8, z -18,6). Lees het (sta er vlak voor): *"K R I S"* en *\*klik\**.
  2. **Steentje 2 (TAL)**: in het **doolhof**, voorbij de **blauwe deur**, helemaal aan de **westkant** (3e vakje van links), halverwege (8e rij van boven). Ligt in een doodlopend gangetje.
  3. **Steentje 3 (100K)**: in het **doolhof**, voorbij de **gele deur**, in de **noordoosthoek** (13e vakje van links, 2e rij van boven). Ook in een doodlopend gangetje.
  4. Heb je alle 3 de steentjes gelezen (de volgorde maakt niet uit)? Dan zakt er (met een gerommel) een stukje heg weg aan de **noordrand** van het doolhof (6e vakje van links, bovenste rij, voorbij de gele deur). Daar is een **geheim kamertje** met een stenen bord: `KRISTAL100K`.
  5. Typ de code in hetzelfde vakje (5 keer snel op je kristallen). *"🎉 Gelukt! +100.000 kristallen 💎"*.
  - Het doolhof is altijd hetzelfde (het wordt gemaakt met een vast getal: 2029), dus deze route klopt altijd. Je kunt maximaal 9.999.999 kristallen hebben.
- Er is ook **Dex zijn eigen code (geheim)**: die geeft **elke keer +1.000 kristallen** (hoofdletters maken niet uit). Hij staat nergens: niet in het spel, niet in deze tekst en niet in de code (alleen een geheime vingerafdruk, een *hash*). Alleen Dex weet hem. Je typt hem in hetzelfde vakje.

### In het dorp
- **Koopman Kees** heeft een kraam: koop hoedjes (voor jou én al je clones), extra hartjes en het gouden **Superzwaard**.
- **Oma Pien** wandelt rond en vertelt grappige dingen. **Knoeper** de hond rent over het plein.

### De Stad (idee van Joshua!)
- Aan de **oostkant van het dorp** (rechts van de kraam van Koopman Kees) staat een **regenboogpoort**. Een bord wijst de weg. De poort is altijd open.
- In De Stad: een plein met een fontein, huizen, een parkje, lantaarnpalen met vlaggetjes en een **autoweg met zebrapaden**.
- **Autootjes** rijden rustig rondjes. Sta je (of een clone) voor een auto? Dan stopt hij en toetert vriendelijk. Niemand raakt hartjes kwijt.
- **Burgemeester Bert** bij de fontein geeft je één keer een cadeautje van **10 kristallen**.
- Daarna heeft Bert **klusjes** voor je (idee van Dex!). Je krijgt ze een voor een: heeft Bert een **!** boven zijn hoofd, dan heeft hij een nieuw klusje. Je ziet ze in het lijstje **📋 Klusjes** (gaat vanzelf open, en staat ook in je rugzak). Bovenin staat bijvoorbeeld *"Klusje 2 van 4"*.
  1. 🦆 **Eendje Ed** (+3 💎): het eendje met het rode strikje is weggelopen naar de hoge flats. Loop naar hem toe, dan waggelt hij achter je aan. Breng hem naar de vijver in het **Stadspark**: plons!
  2. 📦 **Pakje voor Toby Tol** (+3 💎): haal het pakje op bij de **parkeerplaats** en breng het naar Toby Tol bij de speelgoedwinkel. Lopen of met de auto, allebei goed.
  3. 👓 **De bril van Opa Duif** (+4 💎): de bril ligt ergens in De Grote Stad. Hier krijg je geen ster op de kaart: zoeken! (Tip: Opa wandelde bij de hoge flats aan de westkant. Het glinstert.) Breng hem naar Opa Duif, dan draagt hij hem weer.
  4. 🏁 **Rondje Grote Stad** (+5 💎): rij met je **auto** door de **START** op de lange weg, dan door alle 3 de poortjes (oostweg, rotonde, westweg, in elke volgorde) en weer terug naar de START, binnen **90 seconden**. De tijd staat bovenin. Te laat? Gewoon opnieuw door de START. Nog geen auto? Met het cadeautje en de kristallen van de klusjes kun je de Mini Muis kopen.
- Na het laatste klusje: *"Alle klusjes van Bert klaar! De Stad is uitgespeeld!"* en dan *"Er is een nieuwe poort verschenen!"*. In het dorp verschijnt de woestijnpoort met glitters en confetti.
- Vier winkels. Je betaalt met dezelfde **kristallen** 💎 als bij Koopman Kees:
  - **Speelgoedwinkel** (Toby Tol): bal voor Knoeper, jojo, knuffelbeer en **Robotje Bliep** die met je meezweeft.
  - **Snoepwinkel** (Tante Toffee): **Raketsnoep** (20 seconden supersnel), Hartjeslolly (hartjes vol), Knalsnoepje (confetti).
  - **Kledingwinkel** (Madame Mouw): shirts in rood, groen, paars, ninjazwart en goud. Je clones dragen hetzelfde!
  - **Boekwinkel** (Meester Bladwijzer): Clones voor beginners (gratis), Moppenboek, Het Slijmboek en **De verborgen schat**.
- Je spullen zitten in je **rugzak**: tik op snoep om te eten, op speelgoed om te spelen en op een boek om te lezen.
- Lotte en Opa Duif wandelen over het plein.

### De Grote Stad (idee van Dex!)
- De Stad is nu ongeveer **3 keer zo groot**, zodat je lekker kunt rijden. Het plein, de 4 winkels, de Autowinkel en de poort staan nog op dezelfde plek.
- Een **grote ringweg** om de hele stad, met de **Lange weg** aan de noordkant (achter de winkels, daar kun je met de Rode Raket echt hard!).
- Een **rotonde** met een reuzenkristal in het midden.
- Meer straten met bochten en zebrapaden. De Autowinkel heeft nu ook een uitgang naar de oostweg.
- **Flats** (hoge gebouwen met balkonnetjes), meer huizen, een **stadspark** met een vijver, eendjes en een glijbaan, en een **parkeerplaats**.
- 3 extra autootjes rijden over de ringweg en over de rotonde. Ze stoppen nog steeds voor iedereen.
- Huizen, flats en winkels worden doorzichtig als ze tussen jou en de camera staan, zodat je jezelf altijd ziet.
- Overal zacht botsen, nooit schade. Op de kaart (🗺️) zie je alle wegen.

### De Autowinkel (idee van Dex!)
- Rechts in De Stad staat de **Autowinkel**: een echte showroom met een glazen voorkant. Je loopt gewoon door de open deur naar binnen (geen laadscherm). Binnen is het dak weg, zodat je alles goed ziet.
- Op draaiende plateaus staan de auto's, elk met een bordje met de prijs in **kristallen** 💎:
  - 🚗 **Mini Muis** – 12 💎 (geel met stippen en oogjes als lampen, piep piep!)
  - 🚙 **Jungle Jeep** – 25 💎 (grote wielen, rolbeugel en reservewiel)
  - 🏎️ **Bliksem Sport** – 40 💎 (glimmend blauw met strepen en een spoiler)
  - 🏁 **Rode Raket** – 60 💎 (de snelste: glimmend rood, grote spoiler, nummer 1)
  - 🛸 **Wolkenflitser** – 10.000 💎 (wit, strak en elektrisch, met een glazen koepel... en hij kan **VLIEGEN**!)
- Achter de toonbank staat verkoopster **Vera Vroem**. Praat met haar om een auto te kopen. Te weinig kristallen? Dan zegt ze lief hoeveel je nog nodig hebt.
- Je nieuwe auto staat binnen klaar. Stap in en rij door de **grote garagedeur** (die gaat vanzelf open) naar de straat.
- Rijden: snellere auto's gaan harder. Bots je tegen een muur of heg, dan stuiter je zachtjes terug. Geen schade! Je rijdt niet door mensen of andere autootjes heen.
- Met de auto kun je niet door de poort: stap eerst uit. Je clones rennen achter je auto aan.

### De Wolkenflitser: de vliegende auto (idee van Dex!)
- Staat in de Autowinkel op het paarse plateau (waar eerst BINNENKORT stond). Hij zweeft een beetje.
- Hij rijdt gewoon zoals de andere auto's, maar hij kan ook **vliegen**:
  - **iPad/iPhone:** houd de paarse knop **⬆️ Omhoog** ingedrukt om op te stijgen, **⬇️ Omlaag** om te zakken. Laat je los, dan blijf je zweven.
  - **MacBook:** **spatie** = omhoog, **Shift** = omlaag. (In de Wolkenflitser is spatie dus niet uitstappen; uitstappen doe je met **E** of **Enter**.)
- In de lucht vlieg je over wegen, heggen, bomen, lantaarns, huizen en winkels heen. De hoge **flats** zijn te hoog: daar bots je tegenaan. Hoger dan **8 meter** kun je niet (onder de skyline blijven).
- Je zakt niet door een dak heen. Boven een dak kun je niet landen.
- Stap je uit in de lucht (of druk je op **Landen**)? Dan land je eerst zachtjes en stap je daarna vanzelf uit. Met Omlaag land je ook zachtjes (en blijf je zitten).
- Ook vliegend mag je niet door de poort: *"Stap eerst uit!"*. De andere autootjes rijden gewoon door.
- Onder de auto gloeien blauwe straalmotoren, de vleugeltjes klappen uit en er waaien windwolkjes.
- **🔄 Kickflip** (idee van Dex): vlieg je minstens 1,5 meter hoog? Druk op **🔄 Kickflip** (of **F** op de MacBook). Dan maakt de auto een supersnelle rol van 360° (in 0,8 seconde), met een *woesj* en een glitterspoor: *"Kickflip! 😎"*. Je blijft gewoon zitten en vliegt daarna recht verder. Het werkt stilstaand in de lucht en tijdens het vliegen. Daarna even wachten (1,2 s) voor de volgende. Te laag? *"Vlieg eerst wat hoger voor een kickflip!"*
- **🚀 Boost** (idee van Dex): druk op **🚀 Boost** (of **R** op de MacBook). Dan ga je 2 seconden ongeveer **twee keer zo snel**, op de grond en in de lucht (ook zonder te sturen schiet je vooruit). Blauwe vlammen uit de achterkant, een *woesj* en de camera zoomt heel even uit. Daarna laadt de boost 4 seconden op: het ringetje om de knop loopt weer vol. Je botst nog steeds gewoon tegen flats, muren en andere auto's (je schiet er nooit doorheen), en mensen blijven veilig.
- 10.000 kristallen is heel veel! Grote getallen staan overal met een punt: 💎 10.000.

### Overal
- **Hartjes** ❤️: raakt een slijmpje je, dan ben je er een kwijt. Alle hartjes op? Dan word je wakker in het dorp (je verliest niks).
- **Rugzak** 🎒: zie je spullen en kies welk hoedje je draagt.
- **Kaart** 🗺️: zie waar je bent. De ⭐ laat zien waar je heen moet.
- **Muziek** 🎵 en **geluid** 🔊: allebei apart aan en uit te zetten.
- Praatwolken worden letter voor letter getypt, en iedereen heeft een eigen stemmetje.
- Het spel slaat je voortgang vanzelf op.

## Besturing
- **iPad:** sleep met je vinger op de linkerkant van het scherm om te lopen. De grote knop rechts is **Praat** (bij iemand), **Lees** (bij een bord) of **⚔️** (zwaard). Bij de machine: druk op **Clone!**
- **Samen spelen:** tik op **🤝** rechtsboven.
- **Laptop:** lopen met **W A S D** of de **pijltjes**. **E** of **spatie** = praten of zwaaien. **C** = clonen. **M** = kaart. **B** = rugzak. **H** = clones weg/terug.
- **Autorijden:** sta bij je auto en druk op **Instappen** (of **E**, of tik op de auto). Stuur met de joystick of **W A S D**/pijltjes: de auto rijdt de kant op waar je naartoe duwt. **Uitstappen** (of **E**) om uit te stappen.
- **Vliegen (Wolkenflitser):** **⬆️ Omhoog** / **⬇️ Omlaag** ingedrukt houden, of **spatie** / **Shift** op de laptop. **🔄 Kickflip** = **F**, **🚀 Boost** = **R**. **E** of **Enter** = landen en uitstappen.

## Wensenlijst
- [x] Zwaard en gevechten
- [x] Inventaris (een rugzak voor je spullen)
- [x] Grote kaart
- [x] Kerkers (de Slijmgrot)
- [x] Clonemachine: clones van jezelf maken
- [x] Een stad met winkels (idee van Joshua)
- [x] Een autowinkel en zelf autorijden (idee van Dex)
- [x] Een grotere stad met een ringweg, een rotonde en een lange weg (idee van Dex)
- [x] Een vliegende auto 🛸: de Wolkenflitser (idee van Dex)
- [x] Hoofdstuk 3: De Grote Woestijn met piramides, cactussen, een zandstorm, Schorpioen Sjors en het 1e stukje van de schatkaart (idee van Dex)
- [x] Een geheime code voor 100 kristallen (idee van Dex)
- [x] Clones even wegsturen met de 👻-knop (idee van Dex)
- [x] Samen spelen met een code (eerste stap: elkaar zien) (idee van Dex)
- [x] Hoofdstuk 4: Het Doolhof met deuren, knoppen, vallen, schatkisten, Bladkoning Bram en stukje 2 van de schatkaart (idee van Dex)
- [x] Een supergeheime code voor 100.000 kristallen
- [x] Meer clones per stukje schatkaart
- [ ] De andere 8 stukjes van de schatkaart (zie hieronder, Dex kiest!)

## De schatkaart: 10 stukjes 🗺️
Elk stukje ligt in een eigen wereld, en elke wereld is een beetje moeilijker. Stukje 1 en 2 zijn klaar, de rest zijn ideeën (Dex mag ze veranderen!):
1. ✅ De Grote Woestijn: Schorpioen Sjors
2. ✅ Het Doolhof: Bladkoning Bram
3. De IJsberg: glijden over ijs, een sneeuwpopslijm als baas
4. De Vulkaan: lava-stenen springen, een vuurdraak
5. Het Spookkasteel: lichtjes aandoen, een spook dat verstoppertje speelt
6. Onder water: met een duikboot, een grote octopus
7. De Wolkenstad: vliegen met de Wolkenflitser van wolk naar wolk
8. De Jungle: lianen en een gorilla-koning
9. Het Piratenschip: de schatkaart van de piraat zelf, kanonnen
10. Het Schateiland: alle stukjes samen... en de verborgen schat!

## Ideeën voor later (Dex kiest!)
- Clones commando's geven: "wacht hier", "volg mij", "val aan".
- Clones met eigen kleuren of namen.
- Een nieuwe kerker: teken hem met letters in `js/cave.js` (# is muur, . is vloer).
- Een baas die alleen te verslaan is met precies 7 clones.
- Een huisdier dat je kunt kopen bij Koopman Kees.
- Dag en nacht, met lantaarns in het dorp.
- Een boot op de vijver, of een eiland.
- Een racebaan of een garage om je auto te verven.
- De verborgen schat zoeken met een kaart in 10 stukjes: waar liggen stukje 3 tot en met 10? (zie de lijst hierboven)
