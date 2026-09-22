/**
 * Zentrale Standpunkte-Daten für FREIRAUM.
 * Nur formats mit klarer Position: Kommentar, Essay, Gastbeitrag, Position.
 * Die Startseite zeigt die ersten drei veröffentlichten Beiträge in dieser Liste.
 *
 * Lesezeit: bevorzugt aus `body` (Volltext) oder späterer Standpunkt-Seite.
 * `readingMinutes` ist nur Fallback, solange kein Volltext vorliegt.
 *
 * Einordnung wie bei Artikeln:
 * - `topics`: Hauptthemen
 * - `tags`: konkrete Schlagwörter
 */
window.FREIRAUM_OPINIONS = [
  {
    id: "der-unsichtbare-ismus",
    title: "Der unsichtbare -ismus: Wie Schule Kinder klein hält",
    seoTitle: "Der unsichtbare -ismus: Wie Schule Kinder klein hält | FREIRAUM",
    seoDescription:
      "Rassismus, Sexismus – über diese Begriffe wird gesellschaftlich viel gestritten. Adultismus kennt dagegen kaum jemand. Dabei betrifft er eine der selbstverständlichsten Machtordnungen unseres Alltags: Erwachsene entscheiden, Kinder folgen.",
    teaser:
      "Rassismus, Sexismus – über diese Begriffe wird gesellschaftlich viel gestritten. Adultismus kennt dagegen kaum jemand. Dabei betrifft er eine der selbstverständlichsten Machtordnungen unseres Alltags: Erwachsene entscheiden, Kinder folgen.",
    format: "Standpunkt",
    author: "Redaktion FREIRAUM",
    date: "2026-09-20",
    dateModified: "2026-09-22",
    href: "artikel/der-unsichtbare-ismus.html",
    image: "assets/images/der-unsichtbare-ismus.jpg",
    imageAlt: "Zeichnung: Drei große erwachsene Figuren stehen auf einem erhöhten Podest, eine zeigt mit dem Arm nach rechts; darunter stehen drei kleine Kinderfiguren mit Rucksäcken.",
    imageCaption: "",
    imageTone: "default",
    topics: ["Schule & Bildung", "Kindheit & Familie"],
    tags: ["Bildungspolitik"],
    published: true
  },
  {
    id: "illusion-neutralitaet",
    title: "Die Illusion der Neutralität",
    seoTitle: "Die Illusion der Neutralität | FREIRAUM",
    seoDescription:
      "Warum muss sich eigentlich immer die Alternative rechtfertigen? Über einen Schulalltag, in dem der Status quo als selbstverständlich gilt und selbst „das Beste fürs Kind“ keine neutrale Aussage ist.",
    teaser:
      "Warum muss sich eigentlich immer die Alternative rechtfertigen? Über einen Schulalltag, in dem der Status quo als selbstverständlich gilt und selbst „das Beste fürs Kind“ keine neutrale Aussage ist.",
    format: "Kommentar",
    author: "Redaktion FREIRAUM",
    date: "2026-08-30",
    dateModified: null,
    href: "artikel/illusion-neutralitaet.html",
    image: "assets/images/illusion-neutralitaet.jpg",
    imageAlt: "Liniertes Notizblatt auf einem abgenutzten Holztisch, handgeschrieben: „So ist das eben.“ und „Aber warum eigentlich?“",
    imageCaption: "",
    imageTone: "default",
    topics: ["Schule & Bildung", "Gesellschaft & Sozialpsychologie"],
    tags: ["Bildungspolitik", "Eltern und Schule"],
    published: true
  },
  {
    id: "schule-arbeitsmarkt",
    title: "Muss Schule Kinder auf den Arbeitsmarkt vorbereiten?",
    seoTitle: "Muss Schule Kinder auf den Arbeitsmarkt vorbereiten? | FREIRAUM",
    seoDescription:
      "Pünktlichkeit, Leistung, Anpassung: Vieles in der Schule wird mit dem späteren Berufsleben begründet. Doch auf welche Arbeitswelt bereiten wir Kinder eigentlich vor?",
    teaser:
      "Pünktlichkeit, Leistung, Anpassung: Vieles in der Schule wird mit dem späteren Berufsleben begründet. Doch auf welche Arbeitswelt bereiten wir Kinder eigentlich vor?",
    format: "Position",
    author: "Redaktion FREIRAUM",
    date: "2026-07-18",
    dateModified: null,
    href: "artikel/schule-arbeitsmarkt.html",
    image: "assets/images/arbeitsmarkt-schule.jpg",
    imageAlt: "Blick von hinten in ein helles Klassenzimmer: Kinder sitzen an Holztischen, vorne steht eine Lehrkraft",
    imageCaption: "",
    imageTone: "alt",
    topics: ["Schule & Bildung", "Gesellschaft & Sozialpsychologie"],
    tags: ["Bildungspolitik"],
    published: true
  }
];
