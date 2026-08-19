/**
 * Zentrale Standpunkte-Daten für FREIRAUM.
 * Nur formats mit klarer Position: Kommentar, Essay, Gastbeitrag, Position.
 * Die Startseite zeigt die neuesten veröffentlichten Beiträge (max. 3).
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
    id: "bildungsversprechen-zeit",
    title: "Was bleibt vom Bildungsversprechen, wenn Zeit zum Erwachsenwerden fehlt?",
    teaser:
      "Schule organisiert Kindheit in Takten. Eine längere Betrachtung über Tempo, Reife und den Preis von Beschleunigung.",
    format: "Essay",
    author: "Lea Hoffmann",
    date: "2026-07-25",
    readingMinutes: 24,
    href: "#standpunkte",
    topics: ["Schule & Bildung", "Kindheit & Familie"],
    tags: ["Leistungsdruck", "Bildungspolitik"],
    published: true
  },
  {
    id: "illusion-neutralitaet",
    title: "Die Illusion der Neutralität in der Schuldebatte",
    teaser:
      "Wer „nur das Beste fürs Kind“ sagt, spricht selten wertfrei. Ein Kommentar über Sprache, Macht und blinde Flecken.",
    format: "Kommentar",
    author: "Samir El-Kader",
    date: "2026-07-20",
    readingMinutes: 9,
    href: "#standpunkte",
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
