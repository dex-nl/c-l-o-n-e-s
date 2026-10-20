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
- Ook te spelen met het toetsenbord (WASD/pijltjes, E/spatie, C, M, B).
- Soort spel: avontuur in een wereld (zoals Zelda of Pokémon).
- Stijl: **low-poly 3D** met echte schaduwen, golvend water en dingen die bewegen.
- Moet erin: een **clonemachine** waarmee je clones van jezelf maakt.

## Bestanden
- `index.html` – de pagina, laadt Three.js via de CDN (en twee lettertypes van Google Fonts)
- `css/style.css` – knoppen, praatwolk, opdracht, panelen, startscherm
- `js/main.js` – start het spel, de zones, de spel-lus, praten, vechten, clonen
- `js/world.js` – het dorp, de vijver, de poorten (Slijmbos en De Stad), de kraam en de clonemachine
- `js/forest.js` – het Slijmbos, de grotdeur en de 3 drukknoppen
- `js/city.js` – De Stad: plein, fontein, 4 winkels, huizen, de mensen en de regenboogpoort terug
- `js/cars.js` – de autootjes in De Stad (rijden rondjes en stoppen voor iedereen die ervoor staat)
- `js/cityshop.js` – wat de winkels in De Stad verkopen (shirts, speelgoed, snoep, boeken)
- `js/robot.js` – Robotje Bliep, die met je meezweeft
- `js/cave.js` – de Slijmgrot. **De kerker is getekend met letters** (`MAP`): `#` muur, `.` vloer, `K` Koning Slijm, `s`/`b` slijmpjes, `v` vuurschaal, `E` ingang
- `js/props.js` – borden, paddenstoelen, vuurvliegjes
- `js/physics.js` – botsen tegen bomen, huizen en muren
- `js/player.js`, `js/characters.js` – de speler, de poppetjes, het zwaard en de hoedjes
- `js/npc.js` – Professor Bolt, Koopman Kees, Oma Pien en Knoeper de hond
- `js/clones.js` – de clones: volgen, dansen, meevechten, op knoppen staan
- `js/enemies.js` – de slijmpjes en Koning Slijm
- `js/pickups.js` – kristallen, hartjes en de Superbatterij
- `js/effects.js` – confetti, glinsters, stofwolkjes, zwaardboog, schokgolf
- `js/sound.js` – geluidjes én muziek, gemaakt met de Web Audio API (geen geluidsbestanden). Liedjes staan als noten in `SONGS`
- `js/quest.js` – het verhaal: alle stappen (`QUEST_ORDER`) en wat iedereen zegt
- `js/shop.js`, `js/backpack.js`, `js/map.js` – de winkel, de rugzak en de kaart
- `js/controls.js` – joystick, knoppen en toetsenbord
- `js/ui.js` – praatwolk (letter voor letter), hartjes, meldingen, panelen, startscherm
- `js/save.js` – opslaan en oude saves omzetten (nu versie 4)
- `.github/workflows/pages.yml` – zet het spel op GitHub Pages

## Testen
- In de browser-console staat `window.clones` met handige dingen, bijvoorbeeld `clones.goTo('bos', clones.forest.spawns.fromDorp)`, `clones.goTo('stad', clones.city.spawns.fromDorp)` of `clones.state.crystals = 50`.
