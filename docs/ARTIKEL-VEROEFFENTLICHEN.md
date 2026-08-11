# Artikel veröffentlichen (FREIRAUM)

Zentraler Workflow: `tools/publish-article.ps1`  
Hilfsmodul: `tools/FreiraumPublish.psm1`  
HTML-Vorlage: `tools/templates/article.template.html`  
Prüfung: `tools/validate-articles.ps1`

## Ziel

Jeder neue Artikel ist bei Erstellung **SEO-fertig im statischen HTML**.  
Die Metadaten müssen in `view-source:` sichtbar sein (nicht nur per JavaScript).

## Datenquelle

`articles.js` – Felder u. a.:

- `seoTitle`, `seoDescription`
- `image`, `imageAlt`
- `author`, `date`, `dateModified`
- `topics`, `tags`, `href`, `published`

Fallbacks:

- kein `seoTitle` → `[Titel] | FREIRAUM`
- keine `seoDescription` → `teaser`

## Neuer Artikel

1. Artikeltext als Body-HTML vorbereiten (nur Inhalt für `.article-body`, z. B. `<p>…</p><h2>…</h2>`).
2. Coverbild unter `assets/images/` ablegen.
3. Generator ausführen:

```powershell
.\tools\publish-article.ps1 -New `
  -Id "mein-artikel" `
  -Title "Mein Titel" `
  -Teaser "Kurzer Teaser …" `
  -SeoTitle "Mein Titel | FREIRAUM" `
  -SeoDescription "Individuelle Description …" `
  -Label "Analyse" `
  -Author "Redaktion FREIRAUM" `
  -Date "2026-08-12" `
  -Topics "Schule & Bildung" `
  -Tags "Schule","Bildungspolitik" `
  -Image "assets/images/mein-artikel.jpg" `
  -ImageAlt "Sachliche Bildbeschreibung" `
  -BodyFile ".\drafts\mein-artikel.body.html"
```

Der Befehl:

- trägt den Artikel in `articles.js` ein
- erzeugt `artikel/mein-artikel.html`
- schreibt den vollständigen SEO-Head (Title, Description, Canonical, Open Graph, Twitter, JSON-LD)
- bindet Hero über die zentrale `image`-Logik ein (`data-article-cover`)
- lässt die Lesedauer über `[data-reading-time]` berechnen

4. Vor dem Push:

```powershell
.\tools\validate-articles.ps1
```

`publish-article.ps1` aktualisiert dabei automatisch:

- `sitemap.xml` (nur veröffentlichte Vollartikel + indexierbare Seiten)
- `robots.txt` (verweist auf die Sitemap)

Unveröffentlichte Artikel (`published: false`) erscheinen nicht in der Sitemap.

## Sitemap & robots.txt

- Domain ausschließlich: `https://magazin-freiraum.de`
- Artikel-`<lastmod>`: `dateModified` falls gesetzt, sonst `date`
- Manuell neu erzeugen:

```powershell
Import-Module .\tools\FreiraumPublish.psm1 -Force
Update-FreiraumSitemap
Update-FreiraumRobotsTxt
```

## Bestehenden Artikel aktualisieren

Nach Änderungen an SEO-Feldern in `articles.js`:

```powershell
.\tools\publish-article.ps1 -SyncId eltern-schweigen
.\tools\validate-articles.ps1 -Id eltern-schweigen
```

Alle Vollartikel synchronisieren:

```powershell
.\tools\publish-article.ps1 -SyncAll
.\tools\validate-articles.ps1
```

## Qualitätschecks (automatisch)

- genau ein `<title>`, eine Meta Description, ein Canonical
- Canonical und `og:image` absolut auf `https://magazin-freiraum.de`
- Twitter Card + Article JSON-LD
- kein `kaisy84.github.io`
- `datePublished` stimmt; `dateModified` nur wenn gesetzt
- `image` + `imageAlt` vorhanden
- Lesedauer-Platzhalter und Artikelkörper vorhanden

Bei Fehlern: Artikel **nicht** als fertig melden.
