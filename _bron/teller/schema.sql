-- Totalen per dag; niets per bezoeker
CREATE TABLE IF NOT EXISTS tellingen (
  dag TEXT NOT NULL,       -- JJJJ-MM-DD (Belgische tijd)
  soort TEXT NOT NULL,     -- weergaven, pagina, bezoeken, land, bron, taal, toestel
  sleutel TEXT NOT NULL,   -- bv. "/honden.html", "BE", "Facebook", "en", "gsm" ("" bij de totalen)
  aantal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dag, soort, sleutel)
);
