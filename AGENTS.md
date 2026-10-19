# Regels voor AI-helpers (AGENTS.md)

Dit is **C.L.O.N.E.S**, het spel van **Dex (11 jaar)**. Papa en de ooms helpen soms met hun eigen AI.
Iedere AI die helpt, werkt volgens deze regels. Praat met Dex in simpel Nederlands.

## Hoe je met Dex praat
- Leg in **simpele woorden** uit wat je deed, in **maximaal 3 zinnen**.
- Werk in **kleine stapjes**. Na elke stap mag Dex eerst spelen en zeggen wat hij ervan vindt.
- Vraag Dex **eerst** bij grote veranderingen. **Het is zijn spel.**
- Alles blijft **kindvriendelijk**. Koop nooit iets en verstuur niets namens Dex.

## Hoe we werken
- De code staat in de map `c-l-o-n-e-s` en op GitHub in de repo `c-l-o-n-e-s`.
- We gebruiken **Three.js (3D) via een CDN-link** (importmap in `index.html`). **Geen npm, geen build-stap**: gewone bestanden die GitHub Pages direct kan laten zien. Gebruik relatieve paden.
- Na elke werkende stap: **test het spel in een browser**, maak een **commit met een korte Nederlandse beschrijving**, **push** naar GitHub en geef Dex de **speel-link**.
- **Nooit pushen en de repository nooit openbaar maken zonder het OK van Dex' papa.**
- Houd **GAME.md** bij (het idee + de wensenlijst) en schrijf in **LOGBOEK.md** wat er die dag gedaan is.
- De spelvoortgang wordt automatisch opgeslagen in **localStorage** (sleutel `clones-save`) met een **versienummer** (`version`). Verander het opslagformaat nooit zonder dat oude saves blijven werken: verhoog `SAVE_VERSION` en voeg een stap toe in `migrate()` in `js/save.js`.
- Gaat er iets stuk? Ga terug naar een **eerdere commit**.

## Het spel
- Spelen op de **iPad, liggend**: aanraakbediening (joystick links, grote Praat-knop rechts, tikken op personages), een hint als het scherm rechtop staat, en een **manifest + icoon** zodat "Zet op beginscherm" het spel beeldvullend opent.
- Ook te spelen met het toetsenbord (WASD/pijltjes + E/spatie).
- Soort spel: avontuur in een wereld (zoals Zelda of Pokémon).
- Stijl: **low-poly 3D** met echte schaduwen, golvend water en dingen die bewegen.
- Moet erin: een **clonemachine** waarmee je clones van jezelf maakt.

## Bestanden
- `index.html` – de pagina, laadt Three.js via de CDN
- `css/style.css` – knoppen, praatwolk, opdracht
- `js/main.js` – start het spel en de spel-lus
- `js/world.js` – het dorp, de vijver, de clonemachine
- `js/player.js`, `js/characters.js` – de speler en de poppetjes
- `js/npc.js` – Professor Bolt
- `js/quest.js` – de opdracht en wat de uitvinder zegt
- `js/controls.js` – joystick, Praat-knop en toetsenbord
- `js/ui.js` – praatwolk en meldingen
- `js/save.js` – opslaan en oude saves omzetten
- `.github/workflows/pages.yml` – zet het spel op GitHub Pages
