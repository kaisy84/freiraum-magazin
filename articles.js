/**
 * Zentrale Artikel-Daten für FREIRAUM.
 * Neueste zuerst pflegen oder beliebig belassen – die Startseite sortiert nach `date`.
 * `published: false` blendet einen Beitrag aus.
 *
 * Autor: Standard ist „Redaktion FREIRAUM“, sofern kein anderer Autor gesetzt ist.
 * Anzeige: Autor · Datum · automatisch berechnete Lesezeit (script.js, 220 Wpm).
 * `readingMinutes` ist nur noch optionaler Fallback, wenn kein voller Artikeltext
 * (Artikelseite oder `body`) verfügbar ist.
 *
 * Zwei getrennte Ebenen der Einordnung:
 * - `topics`: ausschließlich die fünf Hauptthemen (große redaktionelle Bereiche)
 * - `tags`: konkrete Schlagwörter zum Gegenstand des Beitrags
 *
 * Hauptthemen (ausschließlich diese Bezeichnungen in `topics` verwenden):
 * - Schule & Bildung
 * - Freilernen & Bildungswege
 * - Kindheit & Familie
 * - Lernen & Entwicklung
 * - Gesellschaft & Sozialpsychologie
 */
window.FREIRAUM_TOPICS = [
  {
    id: "schule-bildung",
    name: "Schule & Bildung",
    href: "themen/schule-bildung.html",
    description: "Beiträge zu Schule, Schulsystem und bildungspolitischen Fragen."
  },
  {
    id: "freilernen-bildungswege",
    name: "Freilernen & Bildungswege",
    href: "themen/freilernen-bildungswege.html",
    description: "Beiträge zu Freilernen, Homeschooling und Bildungswegen außerhalb der Schule."
  },
  {
    id: "kindheit-familie",
    name: "Kindheit & Familie",
    href: "themen/kindheit-familie.html",
    description: "Beiträge zu Kindheit, Familie und dem Alltag zwischen Fürsorge und Bildung."
  },
  {
    id: "lernen-entwicklung",
    name: "Lernen & Entwicklung",
    href: "themen/lernen-entwicklung.html",
    description: "Beiträge zu Lernen, Kindheit und individueller Entwicklung."
  },
  {
    id: "gesellschaft-sozialpsychologie",
    name: "Gesellschaft & Sozialpsychologie",
    href: "themen/gesellschaft-sozialpsychologie.html",
    description: "Beiträge zu gesellschaftlichen Fragen und sozialpsychologischen Zusammenhängen."
  }
];

window.FREIRAUM_ARTICLES = [
  {
    id: "freilernen-alltag",
    title: "Freilernen im Alltag: Was bleibt, wenn der Stundenplan wegfällt?",
    teaser:
      "Ein Kind forscht am Küchentisch über Vulkane – ohne Stundenplan und ohne Klingeln. Was bleibt vom Lernen, wenn die äußere Ordnung wegfällt?",
    label: "Reportage",
    author: "Redaktion FREIRAUM",
    date: "2026-08-09",
    href: "artikel/freilernen-alltag.html",
    image: "assets/images/freilernen-alltag.jpg",
    imageAlt: "Kind sitzt auf der Couch und schaut eine Naturdokumentation im Fernsehen",
    imageCaption: "",
    imageTone: "alt",
    topics: ["Freilernen & Bildungswege"],
    tags: ["Freilernen", "Homeschooling"],
    published: true
  },
  {
    id: "schulpflicht-alternativen",
    title: "Schulpflicht ohne Alternativen: Wer entscheidet über Kindheit?",
    teaser:
      "Ein Blick auf die rechtliche Konstruktion der Schulpflicht – und auf das, was sie für Familien bedeutet, die andere Wege suchen.",
    label: "Analyse",
    author: "Redaktion FREIRAUM",
    date: "2026-08-09",
    href: "artikel/schulpflicht-alternativen.html",
    image: "assets/images/schulpflicht-alternativen.jpg",
    imageAlt: "Kinderhand mit Bleistift über einem Matheblatt auf einem Holztisch",
    imageCaption: "",
    imageTone: "default",
    topics: ["Schule & Bildung", "Kindheit & Familie"],
    tags: ["Schulpflicht", "Bildungspolitik", "Homeschooling"],
    published: true
  },
  {
    id: "sozialverhalten-schule",
    title: "Lernen Kinder Sozialverhalten wirklich in der Schule?",
    teaser:
      "Kaum eine Diskussion über Homeschooling oder Freilernen kommt ohne diesen Satz aus: „Aber Kinder müssen doch in die Schule, um Sozialverhalten zu lernen.“",
    label: "Analyse",
    author: "Redaktion FREIRAUM",
    date: "2026-08-04",
    href: "artikel/sozialverhalten-schule.html",
    image: "assets/images/sozialverhalten-schule.jpg",
    imageAlt: "Sechs Kinder sitzen nebeneinander auf einem umgestürzten Baumstamm im Grünen, den Rücken zur Kamera",
    imageCaption: "",
    imageTone: "default",
    topics: ["Schule & Bildung", "Gesellschaft & Sozialpsychologie"],
    tags: ["Sozialverhalten", "Sozialisation", "Jahrgangsklassen", "Homeschooling"],
    published: true
  },
  {
    id: "eltern-schweigen",
    title: "Wenn Eltern in der Schule lieber schweigen",
    teaser:
      "Über Autorität, Abhängigkeit und die Frage, warum offene Kommunikation zwischen Eltern und Lehrkräften schwierig werden kann.",
    label: "Analyse",
    author: "Jonas Bertram",
    date: "2026-07-28",
    readingMinutes: 11,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "sage",
    topics: ["Schule & Bildung", "Kindheit & Familie"],
    tags: ["Eltern und Schule"],
    published: true
  },
  {
    id: "homeschooling-deutschland",
    title: "Homeschooling in Deutschland: Zwischen Tabu und Sehnsucht",
    teaser:
      "Warum eine Praxis, die anderswo legal ist, hierzulande so stark polarisiert – und welche Fragen oft ungeklärt bleiben.",
    label: "Analyse",
    author: "Redaktion FREIRAUM",
    date: "2026-07-26",
    readingMinutes: 13,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "sand",
    topics: ["Freilernen & Bildungswege", "Schule & Bildung"],
    tags: ["Homeschooling", "Schulpflicht", "Bildungspolitik"],
    published: true
  },
  {
    id: "hausaufgaben-notwendigkeit",
    title: "Hausaufgaben: Was bleibt vom Argument der Notwendigkeit?",
    teaser: "Über Nutzen, Belastung und soziale Ungleichheit.",
    label: "Debatte",
    author: "Mira Soltani",
    date: "2026-07-22",
    readingMinutes: 10,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "default",
    topics: ["Schule & Bildung", "Kindheit & Familie"],
    tags: ["Hausaufgaben", "Leistungsdruck"],
    published: true
  },
  {
    id: "noten-wahrheit",
    title: "Noten als Wahrheit: Wie Bewertung Beziehungen formt",
    teaser:
      "Über Leistungsvergleiche, Selbstbilder und die stille Macht einer Zahl auf dem Zeugnis.",
    label: "Debatte",
    author: "Redaktion FREIRAUM",
    date: "2026-07-19",
    readingMinutes: 9,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "alt",
    topics: ["Schule & Bildung", "Lernen & Entwicklung"],
    tags: ["Noten", "Leistungsdruck", "soziale Vergleiche"],
    published: true
  },
  {
    id: "lrs-adhs-schulsystem",
    title: "LRS und ADHS im Schulsystem: Diagnose als Entlastung – oder Etikett?",
    teaser:
      "Wenn das System nicht passt, wird oft das Kind erklärt. Was das für Familien und pädagogische Praxis bedeutet.",
    label: "Analyse",
    author: "Redaktion FREIRAUM",
    date: "2026-07-14",
    readingMinutes: 14,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "sage",
    topics: ["Schule & Bildung", "Lernen & Entwicklung"],
    tags: ["LRS", "ADHS", "Neurodivergenz"],
    published: true
  },
  {
    id: "bildungsgerechtigkeit-nachhilfe",
    title: "Bildungsgerechtigkeit beginnt nicht beim Nachhilfeinstitut",
    teaser:
      "Warum Chancengleichheit nicht nur eine Frage von Förderprogrammen ist, sondern von Struktur und Zeit.",
    label: "Kommentar",
    author: "Redaktion FREIRAUM",
    date: "2026-07-11",
    readingMinutes: 8,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "sand",
    topics: ["Schule & Bildung", "Gesellschaft & Sozialpsychologie"],
    tags: ["Bildungspolitik"],
    published: true
  },
  {
    id: "soziale-vergleiche-jahrgang",
    title: "Soziale Vergleichsprozesse: Was Kinder in Jahrgangsklassen lernen",
    teaser:
      "Neben dem Lehrplan wirkt der Vergleich – leise, dauerhaft und oft folgenreicher als jede einzelne Stunde.",
    label: "Analyse",
    author: "Redaktion FREIRAUM",
    date: "2026-07-07",
    readingMinutes: 12,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "default",
    topics: ["Gesellschaft & Sozialpsychologie", "Lernen & Entwicklung"],
    tags: ["soziale Vergleiche", "Jahrgangsklassen"],
    published: true
  },
  {
    id: "altersmischung-jahrgang",
    title: "Altersmischung statt Jahrgangsklassen: Chance oder Romantisierung?",
    teaser:
      "Ein Plädoyer mit Vorbehalten – und die Frage, was Kinder voneinander lernen können, wenn Alter nicht trennt.",
    label: "Debatte",
    author: "Redaktion FREIRAUM",
    date: "2026-07-02",
    readingMinutes: 11,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "alt",
    topics: ["Lernen & Entwicklung", "Schule & Bildung"],
    tags: ["Jahrgangsklassen"],
    published: true
  },
  {
    id: "digitalisierung-schule",
    title: "Digitalisierung in der Schule: Werkzeug, Ideologie – oder Ablenkung?",
    teaser:
      "Tablets allein ändern wenig. Entscheidend bleibt, wofür Lernen im System eigentlich da sein soll.",
    label: "Analyse",
    author: "Redaktion FREIRAUM",
    date: "2026-06-28",
    readingMinutes: 10,
    href: "#artikel",
    imageAlt: "Platzhalterbild",
    imageCaption: "Platzhalter – Bild folgt",
    imageTone: "sage",
    topics: ["Schule & Bildung"],
    tags: ["Bildungspolitik"],
    published: true
  }
];
