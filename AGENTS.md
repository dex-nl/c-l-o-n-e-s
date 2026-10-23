# Regels voor AI-helpers (AGENTS.md)

Dit is **C.L.O.N.E.S**, het spel van **Dex (11 jaar)**. Papa en de ooms helpen soms met hun eigen AI.
Iedere AI die helpt, werkt volgens deze regels. Praat met Dex in simpel Nederlands.

## Hoe je met Dex praat
- Leg in **simpele woorden** uit wat je deed, in **maximaal 3 zinnen**.
- Werk in **kleine stapjes**. Na elke stap mag Dex eerst spelen en zeggen wat hij ervan vindt.
- Vraag Dex **eerst** bij grote veranderingen. **Het is zijn spel.**
- Alles blijft **kindvriendelijk**. Koop nooit iets en verstuur niets namens Dex.

## Hoe we werken
- De code staat in de map `c-l-o-n-e-s` en op GitHub in de repo [`dex-nl/c-l-o-n-e-s`](https://github.com/dex-nl/c-l-o-n-e-s). Speel-link: https://dex-nl.github.io/c-l-o-n-e-s/
- Nieuwe dingen gaan via een **eigen tak (branch) en een pull request**. Dex of zijn papa kiest of het erin komt (mergen).
- We gebruiken **Three.js (3D) via een CDN-link** (importmap in `index.html`). **Geen npm, geen build-stap**: gewone bestanden die GitHub Pages direct kan laten zien. Gebruik relatieve paden.
- Na elke werkende stap: **test het spel in een browser**, maak een **commit met een korte Nederlandse beschrijving**, **push** naar GitHub en geef Dex de **speel-link**.
- **Nooit pushen en de repository nooit openbaar maken zonder het OK van Dex' papa.**
- Houd **GAME.md** bij (het idee + de wensenlijst) en schrijf in **LOGBOEK.md** wat er die dag gedaan is.
- De spelvoortgang wordt automatisch opgeslagen in **localStorage** (sleutel `clones-save`) met een **versienummer** (`version`). Verander het opslagformaat nooit zonder dat oude saves blijven werken: verhoog `SAVE_VERSION` en voeg een stap toe in `migrate()` in `js/save.js`.
- Gaat er iets stuk? Ga terug naar een **eerdere commit**.

## Het spel
- Spelen op de **iPad, liggend**: aanraakbediening (joystick links, grote Praat-knop rechts, tikken op personages), een hint als het scherm rechtop staat, en een **manifest + icoon** zodat "Zet op beginscherm" het spel beeldvullend opent.
- Ook te spelen met het toetsenbord (WASD/pijltjes, E/spatie, C, M, B, H).
- Soort spel: avontuur in een wereld (zoals Zelda of Pokémon).
- Stijl: **low-poly 3D** met echte schaduwen, golvend water en dingen die bewegen.
- Moet erin: een **clonemachine** waarmee je clones van jezelf maakt.

## Bestanden
- `index.html` – de pagina, laadt Three.js via de CDN (en twee lettertypes van Google Fonts)
- `css/style.css` – knoppen, praatwolk, opdracht, panelen, startscherm
- `js/main.js` – start het spel, de zones, de spel-lus, praten, vechten, clonen
- `js/world.js` – het dorp, de vijver, de poorten (Slijmbos, De Stad en De Grote Woestijn), de kraam en de clonemachine
- `js/forest.js` – het Slijmbos, de grotdeur en de 3 drukknoppen
- `js/city.js` – De Stad: plein, fontein, 4 winkels, huizen, de mensen en de regenboogpoort terug
- `js/citymore.js` – De Grote Stad: de ringweg, de Lange weg, de rotonde, flats, huizen, het stadspark, de parkeerplaats en de route van de autootjes op de ringweg
- `js/optimize.js` – sneller tekenen: stilstaande dingen samenplakken (`mergeStatic`, `mergeLocal`, `mergeGroup`) en veel dezelfde dingen in één keer (`instanced`). Iets nieuws dat beweegt in De Stad? Dat wordt vanzelf herkend (via de `updaters`) en niet samengeplakt.
- `js/cars.js` – de autootjes in De Stad (rijden rondjes en stoppen voor iedereen die ervoor staat)
- `js/cityshop.js` – wat de winkels in De Stad verkopen (shirts, speelgoed, snoep, boeken)
- `js/robot.js` – Robotje Bliep, die met je meezweeft
- `js/autowinkel.js` – de Autowinkel: de showroom (dak gaat weg als je binnen bent), de garagedeur, de auto's (`CARS`, prijzen in kristallen) en het winkelpaneel
- `js/drive.js` – je eigen auto: instappen, sturen, zacht botsen
- `js/desert.js` – De Grote Woestijn (hoofdstuk 3): duinen, cactussen, paden (`PATHS`), oase met Kameel Karel, Sfinx Sam, ruïnes, piramides, de 3 zonnestenen (`SUN_STONES`), de piramidedeur en de zandstorm (`startStorm`/`stopStorm`)
- `js/pyramid.js` – binnen in de Grote Piramide, ook **getekend met letters** (`MAP`): `#` muur, `.` vloer, `S` Schorpioen Sjors, `m` mummieslijmpje, `t` fakkel, `p` vaas, `c` sarcofaag, `H` oude muur met tekens, `E` ingang
- `js/scorpion.js` – Schorpioen Sjors, de baas van de piramide (knijpen, staartstamp, ingraven)
- `js/treasure.js` – de schatkaart in 10 stukjes (getekend op een canvas; `MAP_PIECES` en `MAP_PIECES_TOTAL` in `quest.js`)
- `js/maze.js` – Het Doolhof (hoofdstuk 4): wordt **gemaakt met een vast getal** (`buildMazeLayout`, seed 2029; verandert het, dan klopt de route in GAME.md niet meer!). Heggen als InstancedMesh met een doorzicht-shader (`uCut`), 3 deuren met knoppen, kisten, kristalbloemen (`route`/`showTrail`), rotsen, doornen, het geheime kamertje (`setSecretOpen`) en de ontdekte vakjes voor de kaart (`seenHex`/`explore`)
- `js/bram.js` – Bladkoning Bram, de baas van het doolhof (sprong, doornenkrans, hulpjes roepen, boos bij de helft)
- `js/volcano.js` – De Vulkaan (hoofdstuk 5): lavarivier met springende stenen (`stones`, `onStone`), lavaveld dat stijgt (`flooding`, `onIsland`, `lavaHigh`), vuurballen (`fireball`, `onImpact`), kisten en de krater. Pijn en hoogte regelt `updateVolcano` in `main.js`. Geen auto's in de vulkaan.
- `js/dragon.js` – Vuurdraak Vonk, de baas van de vulkaan (vuuradem met rode punt, vliegen en landen, vuurregen, lavamonsters roepen, boos bij de helft)
- `js/difficulty.js` – **alle moeilijkheid op één plek**: `WORLD_LEVEL` per wereld en `difficulty(zone)` (leven, snelheid, baasklap, hartjes). Nieuwe wereld? Geef hem hier een hoger level.
- `js/cave.js` – de Slijmgrot. **De kerker is getekend met letters** (`MAP`): `#` muur, `.` vloer, `K` Koning Slijm, `s`/`b` slijmpjes, `v` vuurschaal, `E` ingang
- `js/props.js` – borden, paddenstoelen, vuurvliegjes
- `js/physics.js` – botsen tegen bomen, huizen en muren
- `js/player.js`, `js/characters.js` – de speler, de poppetjes, het zwaard en de hoedjes
- `js/npc.js` – Professor Bolt, Koopman Kees, Oma Pien en Knoeper de hond
- `js/clones.js` – de clones: volgen, dansen, meevechten, op knoppen staan
- `js/enemies.js` – de slijmpjes (groen, blauw, mummie, heg) en Koning Slijm (`KINDS`; leven en snelheid worden geschaald met `difficulty.js`)
- `js/pickups.js` – kristallen, hartjes, de Superbatterij en het stukje schatkaart
- `js/effects.js` – confetti, glinsters, stofwolkjes, zwaardboog, schokgolf
- `js/sound.js` – geluidjes én muziek, gemaakt met de Web Audio API (geen geluidsbestanden). Liedjes staan als noten in `SONGS`
- `js/quest.js` – het verhaal: alle stappen (`QUEST_ORDER`) en wat iedereen zegt. **`isCityDone(state)`** bepaalt wanneer de woestijnpoort verschijnt (= alle `JOBS`, de klusjes van Burgemeester Bert, gedaan; of `desertEarly` van een oude save); pas dat alleen daar aan. Ook de klusjes zelf (`JOBS`, `LAP_TIME`) en wat Bert zegt
- `js/shop.js`, `js/backpack.js`, `js/map.js` – de winkel, de rugzak en de kaart
- `js/controls.js` – joystick, knoppen en toetsenbord
- `js/ui.js` – praatwolk (letter voor letter), hartjes, meldingen, panelen, startscherm
- `js/jobs.js` – de klusjes in De Stad die je ziet: Eendje Ed, het pakje, de bril van Opa Duif en de poortjes voor het rondje (`JOB_SPOTS`)
- `js/drive.js` – je eigen auto rijden, en vliegen met de Wolkenflitser (`fly()`, plafond `FLY_CEILING` in `autowinkel.js`). Voor vliegen hebben botsdingen een hoogte `h` (bomen, huizen, winkels, flats); zonder `h` telt 1,5 m. Daken en gevels in de lucht staan in `zone.airBoxes` (`low`..`h`)
- `js/secret.js` – Dex zijn eigen code (geheim) en de geheime auto-code: alleen SHA-256-hashes (met een kleine reserve-hash als `crypto.subtle` er niet is). `secretCode(tekst)` geeft `'dex'`, `'auto'` of `null`. **Schrijf de codes nooit ergens op** (niet in code, docs, tests in de repo, commits, PR's of in het spel)
- Kickflip en Boost van de Wolkenflitser: `myCar.kickflip()` / `myCar.boost()` in `drive.js` (tijden: `KICKFLIP_*`, `BOOST_*`); knoppen `#flip-btn` / `#boost-btn` in `#fly-btns`, toetsen F en R (alleen in de Wolkenflitser)
- `js/net.js` – Samen spelen: PeerJS (van een CDN, pas geladen als je op 🤝 drukt), peer-id `clones-dex-` + code, de host stuurt alles door (`MAX_PLAYERS` 4, `SEND_HZ` 10). Over het netwerk gaat **alleen** `{ t, slot, w, x, z, r, y, c }` (wereld, plek, kant, hoogte, auto); `cleanState` controleert alles wat binnenkomt. **Stuur nooit save-gegevens, kristallen, codes of hashes over het netwerk** en voeg geen vrije tekst/chat toe. `window.__clonesTestPeer` is alleen voor de tests (nep-netwerk)
- `js/format.js` – `fmt(n)`: grote getallen met een punt (10.000)
- `js/save.js` – opslaan en oude saves omzetten (nu versie 9: `volcano` = `{ dragon, chests }`; versie 8: `maze` = `{ seen, doors, chests, levers, secret, bram }`, codes in `CODE_REWARDS`, max `MAX_CRYSTALS`; versie 7: `jobs` = `{ done, active, step }`, `desertEarly`; versie 6: `mapPieces`, `codes`, `clonesHidden`; `quest.stones` en `quest.bossBeaten` tijdens hoofdstuk 3)
- `.github/workflows/pages.yml` – zet het spel op GitHub Pages

## Testen
- Testen van de klusjes: `clones.state.jobs`, `clones.cityJobs` (bijvoorbeeld `clones.cityJobs.lap`), `clones.openJobs()`, `clones.finishJob(id)` (alleen voor het klusje dat bezig is).
- Testen van hoofdstuk 3: `clones.unlockDesert()` laat de woestijnpoort meteen verschijnen alsof alle klusjes klaar zijn (wordt niet opgeslagen), `clones.goTo('woestijn', clones.desert.spawns.fromDorp)`, `clones.desert.startStorm()`, `clones.toggleClones()`. De geheime code staat in GAME.md: **verklap hem niet in het spel** (geen hints, geen knop).
- In de browser-console staat `window.clones` met handige dingen, bijvoorbeeld `clones.goTo('bos', clones.forest.spawns.fromDorp)`, `clones.goTo('stad', clones.city.spawns.fromDorp)` of `clones.state.crystals = 50`.
