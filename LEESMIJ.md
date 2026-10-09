# Website Vai Avanti

## De site aanpassen

**Beheerpagina** (`/beheer/` op de site). Hier pas je alles aan, met een live voorbeeld:

- **Pagina's**: elke pagina (ook Onze honden, Nesten en Nieuws) bestaat uit blokken. Blokken toevoegen, verslepen en bewerken; nieuwe pagina's maken en in het menu zetten.
  - Koppen (paginakop en de grote foto op de startpagina) kunnen meerdere foto's hebben: die wisselen vanzelf af. Bij "Opmaak van de kop" kies je hoogte, uitlijning, donkerte en het belangrijkste deel van de foto.
  - Elk blok kan eigen kleuren krijgen bij "Kleuren van dit blok" (achtergrond, tekst, accent).
  - Woorden tussen accolades vult de site zelf in: `{verslagen}`, `{sinds}`, `{honden}`, `{nesten}`, `{nestletters}`, `{titels}`, `{plaats}`, `{jaar}`.
- **Verslagen**: nieuwe wedstrijdverslagen schrijven, zoeken, aanpassen of verwijderen. Herkende honden staan onder de tekst.
- **Honden**: alle gegevens, foto's, palmares en gezondheid; volgorde met de pijltjes.
- **Nesten**: nesten met hun pups.
- **Instellingen**: kleuren en lettertypes van de hele site, het menu (welke pagina's, volgorde, namen, knop rechts), de voettekst, verwachte nesten en contactgegevens.

**Opslaan en Publiceren**

- **Opslaan** bewaart je werk in de tak `concept` op GitHub. Bezoekers zien het nog niet; je kunt later verder werken, ook op een ander toestel.
- **Publiceren** bewaart en zet het concept in `main`. GitHub bouwt dan de site (± 1 minuut); het beheer meldt "Staat online".
- Wijzigingen die intussen online kwamen (bv. via Pages CMS) worden automatisch in het concept meegenomen.
- Een concept weggooien kan bij Instellingen.

Aanmelden gaat met een **wachtwoord**. Achter dat wachtwoord zit een koppelcode (een GitHub "fine-grained token" voor enkel deze repository). De koppelcode staat versleuteld in `_bron/beheer/sleutel.json` (PBKDF2 met 600.000 rondes + AES-GCM). Zonder het wachtwoord is ze onbruikbaar.

- Wachtwoord instellen of veranderen (Keanu): open /beheer, klik "Wachtwoord instellen (voor Keanu)", plak een nieuwe koppelcode en kies een wachtwoord van minstens 12 tekens.
- Rechten van de koppelcode: Contents (Read and write) en Actions (Read-only).
- Verloopt de koppelcode, dan meldt het beheer dat bij het aanmelden. Maak dan een nieuwe en stel het wachtwoord opnieuw in.
- "Onthoud mij op dit toestel" bewaart de koppelcode in die browser. Afmelden staat bij Instellingen.

**Pages CMS** (app.pagescms.org) blijft werken als reserve. Alles staat er ook in als formulieren.

## Hoe het werkt

- **inhoud/**: alle inhoud.
  - `nieuws/`: één JSON-bestand per wedstrijdverslag (de lopende tekst staat in het veld `tekst`).
  - `honden/`: één bestand per hond.
  - `nesten/`: één bestand per nest, met de pups erin.
  - `paginas/`: alle pagina's (startpagina, Onze honden, Nesten, Nieuws, Over ons, Contact en eigen pagina's), opgebouwd uit blokken.
  - `site.json`: instellingen (kleuren en lettertypes, menu, voettekst, verwachte nesten, contactgegevens).
- **_bron/assets/blokken.js**: de bloktypes en hun opmaak. De site én de beheerpagina gebruiken dit bestand, zodat het voorbeeld klopt.
- **_bron/beheer/**: de beheerpagina.
- **_bron/tools/cms-config.js**: zet de bloktypes en bestandsformaten ook in `.pages.yml`. Draai dit na een wijziging aan de bloktypes.
- **media/**: alle foto's. Nieuwe foto's uit het beheer of Pages CMS komen hier terecht.
- **vertalingen/**: de vertalingen per taal (zie Talen).
- **.pages.yml**: hoe het beheerscherm eruitziet (velden en labels).
- **.github/workflows/website.yml**: na elke wijziging bouwt GitHub de site en zet ze online.
- **_bron/**: opmaak (`assets/`) en scripts (`tools/`). Shany hoeft hier nooit iets aan te doen.
- **site/**: de gebouwde website. Die wordt automatisch gemaakt, dus niet zelf aanpassen.

## Wat de site automatisch doet

- Foto's verkleinen. Grote gsm-foto's worden lichte webversies (groot formaat + miniatuur).
- Honden herkennen in verslagen. De roepnaam (ook met -je erachter, zoals Moosje) en de officiële naam worden gelinkt. Extra namen voeg je per hond toe bij "Andere namen in verslagen".
- Verbanden leggen op naam:
  - Een pup met dezelfde officiële naam als een hond krijgt een link naar diens pagina.
  - Een moeder met de naam van een van onze honden wordt gelinkt.
  - Nesten verschijnen bij de ouders als "Moeder van" of "Vader van".
- Volgorde van de verslagen: de nieuwste datum eerst. Oude verslagen van Webnode hebben geen dag, daar wordt enkel het jaar getoond.

## Talen

De site bestaat in het Nederlands (hoofdmap) en in het Engels, Duits, Italiaans, Fins en Deens (`/en/`, `/de/`, `/it/`, `/fi/`, `/da/`). Bezoekers kiezen hun taal rechtsboven; spreekt hun browser een andere taal, dan krijgen ze onderaan een kleine hint.

- Je schrijft alles in het Nederlands. Bij elke publicatie zoekt de bouwstap (`_bron/tools/vertaal.js`) welke teksten nieuw of gewijzigd zijn en laat enkel die vertalen door Claude (model `claude-opus-5-5`).
- Daarvoor staat in GitHub een geheim **ANTHROPIC_API_KEY** (repository → Settings → Secrets and variables → Actions). Zonder sleutel blijft alles werken: nieuwe teksten staan dan in het Nederlands op de anderstalige pagina's tot de sleutel er is. Een taal die voor minder dan 80% vertaald is, komt niet online.
- Alle vertalingen staan in `vertalingen/<taal>.json` (`nl` = bron, `vertaling` = vertaling). GitHub zet nieuwe vertalingen daar zelf bij ("Vertalingen bijgewerkt"). Een vertaling verbeteren: pas ze daar aan; zolang de Nederlandse tekst niet verandert, blijft jouw versie staan.
- Namen van honden, mensen, renbanen en wedstrijden worden niet vertaald. Vaste teksten van de site (knoppen, labels) staan in de code als `t("...")` en worden ook automatisch vertaald.
- Welke talen online staan, kies je in het beheer bij Instellingen → Talen.
- Kosten: de hele site is ongeveer 50.000 tekens; een nieuw verslag vertalen naar vijf talen kost enkele eurocent.

## Zelf bekijken op de computer

```
npm install
npm run build
npm run serve
```

Open daarna http://localhost:8790.

## Contactformulier

1. Maak een gratis sleutel aan op https://web3forms.com.
2. Zet de sleutel in `_bron/config.json`: `{ "web3formsKey": "jouw-sleutel" }`.

Zonder sleutel toont het formulier het e-mailadres en telefoonnummer; het opent nooit een e-mailprogramma.

## Deelbare link (claude.ai)

`npm run share` maakt `_deelbaar/`. Daarmee werkt Claude de link bij.

## Oud

`_bron/oud/` bevat de eerste versie (één pagina) en de scripts waarmee de inhoud van Webnode is overgezet.
