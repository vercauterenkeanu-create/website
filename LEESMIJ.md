# Website Vai Avanti

## Hoe het werkt

- **inhoud/**: alle teksten, bewerkbaar via Pages CMS (app.pagescms.org).
  - `nieuws/`: één bestand per wedstrijdverslag.
  - `honden/`: één bestand per hond.
  - `nesten/`: één bestand per nest, met de pups erin.
  - `site.json`: de algemene teksten (startpagina, verwachte nesten, over ons, contact, foto's bovenaan de pagina's).
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
