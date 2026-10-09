# Website Vai Avanti

## Twee manieren om de site aan te passen

- **Beheerpagina** (`/beheer/` op de site). Hier pas je pagina's en instellingen aan, met een live voorbeeld.
  - Blokken toevoegen, verslepen en bewerken.
  - Nieuwe pagina's maken en in het menu zetten.
  - Foto's uploaden.
  - Opslaan gebeurt met een koppelcode: een GitHub "fine-grained token" voor enkel deze repository, met Contents: Read and write. De uitleg staat op de aanmeldpagina zelf.
- **Pages CMS** (app.pagescms.org). Hier staan wedstrijdverslagen, honden en nesten als formulieren. De pagina's en instellingen kunnen hier ook.

## Hoe het werkt

- **inhoud/**: alle inhoud.
  - `nieuws/`: één bestand per wedstrijdverslag.
  - `honden/`: één bestand per hond.
  - `nesten/`: één bestand per nest, met de pups erin.
  - `paginas/`: startpagina, Over ons, Contact en eigen pagina's, opgebouwd uit blokken.
  - `site.json`: instellingen (verwachte nesten, contactgegevens, foto's bovenaan de vaste pagina's).
- **_bron/assets/blokken.js**: de bloktypes en hun opmaak. De site én de beheerpagina gebruiken dit bestand, zodat het voorbeeld klopt.
- **_bron/beheer/**: de beheerpagina.
- **_bron/tools/cms-config.js**: zet de bloktypes ook in `.pages.yml`. Draai dit na een wijziging aan de bloktypes.
- **media/**: alle foto's. Nieuwe foto's uit Pages CMS komen hier terecht.
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

Zonder sleutel opent het formulier het e-mailprogramma van de bezoeker.

## Deelbare link (claude.ai)

`npm run share` maakt `_deelbaar/`. Daarmee werkt Claude de link bij.

## Oud

`_bron/oud/` bevat de eerste versie (één pagina) en de scripts waarmee de inhoud van Webnode is overgezet.
