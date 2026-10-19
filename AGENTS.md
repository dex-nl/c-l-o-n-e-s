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
- Na elke werkende stap: **test het spel in een browser** (iPad, iPhone en MacBook-formaat) en maak een **commit met een korte Nederlandse beschrijving**.
- **Elke stap op een eigen branch** (bijvoorbeeld `clonemachine`, `bos`). Push alleen die branch en maak er een **pull request** van naar `main`.
- **Push nooit rechtstreeks naar `main` en merge niet zelf.** Dex of zijn papa kijkt de pull request na en merget. Daarna zet GitHub Pages het spel online en kun je Dex de **speel-link** geven: https://dvdelzen.github.io/c-l-o-n-e-s/
- Is de vorige branch nog niet gemerged? Begin de nieuwe branch dan vanaf de vorige branch.
- **Nooit pushen en de repository nooit openbaar maken zonder het OK van Dex' papa.**
- Houd **GAME.md** bij (het idee + de wensenlijst) en schrijf in **LOGBOEK.md** wat er die dag gedaan is.
- De spelvoortgang wordt automatisch opgeslagen in **localStorage** (sleutel `clones-save`) met een **versienummer** (`version`). Verander het opslagformaat nooit zonder dat oude saves blijven werken: verhoog `SAVE_VERSION` en voeg een stap toe in `migrate()` in `js/save.js`.
- Gaat er iets stuk? Ga terug naar een **eerdere commit**.

## Het spel
- Spelen op de **iPad, liggend** (en ook iPhone liggend en MacBook): aanraakbediening (joystick links, grote Praat- en Kloon-knop rechts, tikken op personages; alles schaalt mee met het scherm), een hint als het scherm rechtop staat, en een **manifest + icoon** zodat "Zet op beginscherm" het spel beeldvullend opent.
- Ook te spelen met het toetsenbord (WASD/pijltjes + E/spatie, C = klonen, F = Blijf, V = Volg).
- De wereld wordt **steeds moeilijker** hoe verder je gaat (gebied 1 = het bos). Aan het einde ligt een **schat**. Houd alles kindvriendelijk: puzzels, geen enge of gewelddadige dingen.
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
- `js/controls.js` – joystick, Praat- en Kloon-knop en toetsenbord
- `js/clones.js` – de clones die je volgen (en Blijf/Volg)
- `js/forest.js` – gebied 1: het bos, de uil, de drukknoppen en poorten
- `js/ui.js` – praatwolk en meldingen
- `js/save.js` – opslaan en oude saves omzetten
- `.github/workflows/pages.yml` – zet het spel op GitHub Pages
