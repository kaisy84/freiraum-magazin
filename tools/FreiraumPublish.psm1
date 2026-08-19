# FREIRAUM article publishing helpers.
# Source of truth for article metadata: articles.js
# Static SEO must land in artikel/*.html (visible in view-source).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:FreiraumSiteOrigin = "https://magazin-freiraum.de"
$script:FreiraumSeoStart = "<!-- freiraum-seo:start -->"
$script:FreiraumSeoEnd = "<!-- freiraum-seo:end -->"
$script:WordsPerMinute = 220

function Get-FreiraumRoot {
  if ($PSScriptRoot) {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  }
  return (Get-Location).Path
}

function Get-AssetVersion {
  param([string]$Root = (Get-FreiraumRoot))
  $index = Join-Path $Root "index.html"
  $text = [IO.File]::ReadAllText($index, [Text.Encoding]::UTF8)
  $m = [regex]::Match($text, 'style\.css\?v=([0-9a-zA-Z]+)')
  if ($m.Success) { return $m.Groups[1].Value }
  return (Get-Date -Format "yyyyMMdd") + "a"
}

function ConvertFrom-JsString {
  param([string]$Value)
  if ($null -eq $Value) { return $null }
  return ($Value -replace '\\"', '"' -replace '\\n', "`n" -replace '\\/', '/')
}

function Get-JsFieldString {
  param(
    [string]$Block,
    [string]$Name
  )
  # Single-line or same-line string
  $m = [regex]::Match(
    $Block,
    "(?ms)$Name\s*:\s*`"((?:\\.|[^`"])*)`""
  )
  if ($m.Success) {
    return (ConvertFrom-JsString $m.Groups[1].Value)
  }
  return $null
}

function Get-JsFieldNullOrString {
  param([string]$Block, [string]$Name)
  if ([regex]::IsMatch($Block, "(?m)$Name\s*:\s*null\b")) { return $null }
  return (Get-JsFieldString -Block $Block -Name $Name)
}

function Get-JsFieldArray {
  param([string]$Block, [string]$Name)
  $m = [regex]::Match($Block, "(?ms)$Name\s*:\s*\[(.*?)\]")
  if (-not $m.Success) { return @() }
  $inner = $m.Groups[1].Value
  $items = [regex]::Matches($inner, '`"((?:\\.|[^`"])*)`"') | ForEach-Object {
    ConvertFrom-JsString $_.Groups[1].Value
  }
  return @($items)
}

function Get-JsFieldBool {
  param([string]$Block, [string]$Name, [bool]$Default = $true)
  $m = [regex]::Match($Block, "(?m)$Name\s*:\s*(true|false)\b")
  if (-not $m.Success) { return $Default }
  return ($m.Groups[1].Value -eq "true")
}

function Get-FreiraumArticles {
  param([string]$Root = (Get-FreiraumRoot))
  $path = Join-Path $Root "articles.js"
  $raw = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  $marker = "window.FREIRAUM_ARTICLES = ["
  $start = $raw.IndexOf($marker)
  if ($start -lt 0) { throw "FREIRAUM_ARTICLES not found in articles.js" }
  $arrayStart = $start + $marker.Length - 1
  $end = $raw.IndexOf("`n];", $arrayStart)
  if ($end -lt 0) { throw "Could not find end of FREIRAUM_ARTICLES" }
  $inner = $raw.Substring($arrayStart + 1, $end - $arrayStart - 1)

  $blocks = [regex]::Split($inner, '(?=\r?\n  \{\r?\n    id:)') | Where-Object {
    $_.Trim().Length -gt 0 -and $_ -match 'id:\s*"'
  }

  $articles = @()
  foreach ($block in $blocks) {
    $id = Get-JsFieldString -Block $block -Name "id"
    if (-not $id) { continue }
    $articles += [pscustomobject]@{
      id             = $id
      title          = Get-JsFieldString -Block $block -Name "title"
      seoTitle       = Get-JsFieldString -Block $block -Name "seoTitle"
      seoDescription = Get-JsFieldString -Block $block -Name "seoDescription"
      teaser         = Get-JsFieldString -Block $block -Name "teaser"
      label          = Get-JsFieldString -Block $block -Name "label"
      author         = Get-JsFieldString -Block $block -Name "author"
      date           = Get-JsFieldString -Block $block -Name "date"
      dateModified   = Get-JsFieldNullOrString -Block $block -Name "dateModified"
      href           = Get-JsFieldString -Block $block -Name "href"
      image          = Get-JsFieldString -Block $block -Name "image"
      imageAlt       = Get-JsFieldString -Block $block -Name "imageAlt"
      imageCaption   = Get-JsFieldString -Block $block -Name "imageCaption"
      imageTone      = Get-JsFieldString -Block $block -Name "imageTone"
      topics         = @(Get-JsFieldArray -Block $block -Name "topics")
      tags           = @(Get-JsFieldArray -Block $block -Name "tags")
      published      = Get-JsFieldBool -Block $block -Name "published" -Default $true
      readingMinutes = $null
      rawBlock       = $block
    }
  }
  return $articles
}

function Get-FreiraumOpinions {
  param([string]$Root = (Get-FreiraumRoot))
  $path = Join-Path $Root "opinions.js"
  if (-not (Test-Path $path)) { return @() }
  $raw = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  $marker = "window.FREIRAUM_OPINIONS = ["
  $start = $raw.IndexOf($marker)
  if ($start -lt 0) { throw "FREIRAUM_OPINIONS not found in opinions.js" }
  $arrayStart = $start + $marker.Length - 1
  $end = $raw.IndexOf("`n];", $arrayStart)
  if ($end -lt 0) { throw "Could not find end of FREIRAUM_OPINIONS" }
  $inner = $raw.Substring($arrayStart + 1, $end - $arrayStart - 1)

  $blocks = [regex]::Split($inner, '(?=\r?\n  \{\r?\n    id:)') | Where-Object {
    $_.Trim().Length -gt 0 -and $_ -match 'id:\s*"'
  }

  $opinions = @()
  foreach ($block in $blocks) {
    $id = Get-JsFieldString -Block $block -Name "id"
    if (-not $id) { continue }
    $format = Get-JsFieldString -Block $block -Name "format"
    $label = Get-JsFieldString -Block $block -Name "label"
    $opinions += [pscustomobject]@{
      id             = $id
      title          = Get-JsFieldString -Block $block -Name "title"
      seoTitle       = Get-JsFieldString -Block $block -Name "seoTitle"
      seoDescription = Get-JsFieldString -Block $block -Name "seoDescription"
      teaser         = Get-JsFieldString -Block $block -Name "teaser"
      label          = $(if ($format) { $format } elseif ($label) { $label } else { "Standpunkt" })
      format         = $format
      author         = Get-JsFieldString -Block $block -Name "author"
      date           = Get-JsFieldString -Block $block -Name "date"
      dateModified   = Get-JsFieldNullOrString -Block $block -Name "dateModified"
      href           = Get-JsFieldString -Block $block -Name "href"
      image          = Get-JsFieldString -Block $block -Name "image"
      imageAlt       = Get-JsFieldString -Block $block -Name "imageAlt"
      imageCaption   = Get-JsFieldString -Block $block -Name "imageCaption"
      imageTone      = Get-JsFieldString -Block $block -Name "imageTone"
      topics         = @(Get-JsFieldArray -Block $block -Name "topics")
      tags           = @(Get-JsFieldArray -Block $block -Name "tags")
      published      = Get-JsFieldBool -Block $block -Name "published" -Default $true
      readingMinutes = $null
      rawBlock       = $block
    }
  }
  return $opinions
}

function Get-FreiraumPublishedFullPages {
  param([string]$Root = (Get-FreiraumRoot))
  $articles = @(Get-FreiraumArticles -Root $Root | Where-Object {
    $_.published -and $_.href -match '^artikel/.+\.html$'
  })
  $opinions = @(Get-FreiraumOpinions -Root $Root | Where-Object {
    $_.published -and $_.href -match '^artikel/.+\.html$'
  })
  return @($articles + $opinions)
}

function Get-ArticleSeoTitle {
  param($Article)
  if ($Article.seoTitle -and $Article.seoTitle.Trim()) { return $Article.seoTitle.Trim() }
  return "$($Article.title) | FREIRAUM"
}

function Get-ArticleSeoDescription {
  param($Article)
  if ($Article.seoDescription -and $Article.seoDescription.Trim()) {
    return $Article.seoDescription.Trim()
  }
  if ($Article.teaser -and $Article.teaser.Trim()) { return $Article.teaser.Trim() }
  return ""
}

function Get-AbsoluteUrl {
  param([string]$Path)
  if (-not $Path) { return "$script:FreiraumSiteOrigin/" }
  if ($Path -match '^https?://') {
    if ($Path -match 'github\.io') {
      $uri = [Uri]$Path
      return "$script:FreiraumSiteOrigin$($uri.AbsolutePath)"
    }
    return $Path
  }
  $clean = $Path.TrimStart('.', '/').Replace('\', '/')
  return "$script:FreiraumSiteOrigin/$clean"
}

function Escape-HtmlAttr {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  return ($Value -replace '&', '&amp;' -replace '"', '&quot;' -replace '<', '&lt;' -replace '>', '&gt;')
}

function Escape-JsonString {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  $Value = $Value -replace '\\', '\\' -replace '"', '\"' -replace "`r", '' -replace "`n", '\n'
  return $Value
}

function Format-GermanDate {
  param([string]$IsoDate)
  $culture = [Globalization.CultureInfo]::GetCultureInfo("de-DE")
  $dt = [DateTime]::ParseExact($IsoDate, "yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
  return $dt.ToString("d. MMMM yyyy", $culture)
}

function Get-SchemaAuthorObject {
  param($Article)
  $name = if ($Article.author -and $Article.author.Trim()) { $Article.author.Trim() } else { "Redaktion FREIRAUM" }
  if ($name -match '(?i)^redaktion\s+freiraum$') {
    return @{ "@type" = "Organization"; name = "Redaktion FREIRAUM" }
  }
  if ($name -match '(?i)^anonym\b') {
    return @{ "@type" = "Organization"; name = "FREIRAUM" }
  }
  return @{ "@type" = "Person"; name = $name }
}

function Get-AuthorDisplayName {
  param($Article)
  $name = if ($Article.author -and $Article.author.Trim()) { $Article.author.Trim() } else { "Redaktion FREIRAUM" }
  if ($name -match '(?i)^redaktion\s+freiraum$') { return "Redaktion FREIRAUM" }
  return "Von $name"
}

function Get-ReadingMinutesFromHtml {
  param([string]$Html)
  $plain = [regex]::Replace($Html, '(?is)<script.*?</script>', ' ')
  $plain = [regex]::Replace($plain, '(?is)<style.*?</style>', ' ')
  $plain = [regex]::Replace($plain, '(?s)<[^>]+>', ' ')
  $plain = [regex]::Replace($plain, '&[a-zA-Z0-9#]+;', ' ')
  $plain = [regex]::Replace($plain, '\s+', ' ').Trim()
  if (-not $plain) { return 1 }
  $words = ($plain -split '\s+').Count
  return [Math]::Max(1, [Math]::Ceiling($words / $script:WordsPerMinute))
}

function New-ArticleSeoBlock {
  param($Article)

  $seoTitle = Get-ArticleSeoTitle $Article
  $seoDescription = Get-ArticleSeoDescription $Article
  $canonical = Get-AbsoluteUrl $Article.href
  $imageUrl = if ($Article.image) { Get-AbsoluteUrl $Article.image } else { $null }
  $section = if ($Article.topics -and $Article.topics.Count -gt 0) { [string]$Article.topics[0] } else { "" }
  $modified = if ($Article.dateModified) { [string]$Article.dateModified } else { $null }
  $author = Get-SchemaAuthorObject $Article
  $authorType = [string]$author["@type"]
  $authorName = [string]$author["name"]

  $lines = New-Object System.Collections.Generic.List[string]
  [void]$lines.Add($script:FreiraumSeoStart)
  [void]$lines.Add("  <title>$(Escape-HtmlAttr $seoTitle)</title>")
  [void]$lines.Add("  <meta name=`"description`" content=`"$(Escape-HtmlAttr $seoDescription)`">")
  [void]$lines.Add("  <link rel=`"canonical`" href=`"$(Escape-HtmlAttr $canonical)`">")
  [void]$lines.Add('  <meta property="og:type" content="article">')
  [void]$lines.Add('  <meta property="og:site_name" content="FREIRAUM">')
  [void]$lines.Add("  <meta property=`"og:title`" content=`"$(Escape-HtmlAttr $seoTitle)`">")
  [void]$lines.Add("  <meta property=`"og:description`" content=`"$(Escape-HtmlAttr $seoDescription)`">")
  [void]$lines.Add("  <meta property=`"og:url`" content=`"$(Escape-HtmlAttr $canonical)`">")
  if ($imageUrl) {
    [void]$lines.Add("  <meta property=`"og:image`" content=`"$(Escape-HtmlAttr $imageUrl)`">")
  }
  if ($Article.date) {
    [void]$lines.Add("  <meta property=`"article:published_time`" content=`"$(Escape-HtmlAttr $Article.date)`">")
  }
  if ($modified) {
    [void]$lines.Add("  <meta property=`"article:modified_time`" content=`"$(Escape-HtmlAttr $modified)`">")
  }
  if ($section) {
    [void]$lines.Add("  <meta property=`"article:section`" content=`"$(Escape-HtmlAttr $section)`">")
  }
  [void]$lines.Add('  <meta name="twitter:card" content="summary_large_image">')
  [void]$lines.Add("  <meta name=`"twitter:title`" content=`"$(Escape-HtmlAttr $seoTitle)`">")
  [void]$lines.Add("  <meta name=`"twitter:description`" content=`"$(Escape-HtmlAttr $seoDescription)`">")
  if ($imageUrl) {
    [void]$lines.Add("  <meta name=`"twitter:image`" content=`"$(Escape-HtmlAttr $imageUrl)`">")
  }

  $jsonLines = New-Object System.Collections.Generic.List[string]
  [void]$jsonLines.Add("  {")
  [void]$jsonLines.Add('    "@context": "https://schema.org",')
  [void]$jsonLines.Add('    "@type": "Article",')
  [void]$jsonLines.Add(('    "headline": "{0}",' -f (Escape-JsonString $Article.title)))
  [void]$jsonLines.Add(('    "description": "{0}",' -f (Escape-JsonString $seoDescription)))
  if ($imageUrl) {
    [void]$jsonLines.Add(('    "image": ["{0}"],' -f (Escape-JsonString $imageUrl)))
  }
  [void]$jsonLines.Add(('    "datePublished": "{0}",' -f (Escape-JsonString $Article.date)))
  if ($modified) {
    [void]$jsonLines.Add(('    "dateModified": "{0}",' -f (Escape-JsonString $modified)))
  }
  [void]$jsonLines.Add('    "author": {')
  [void]$jsonLines.Add(('      "@type": "{0}",' -f (Escape-JsonString $authorType)))
  [void]$jsonLines.Add(('      "name": "{0}"' -f (Escape-JsonString $authorName)))
  [void]$jsonLines.Add("    },")
  [void]$jsonLines.Add('    "publisher": {')
  [void]$jsonLines.Add('      "@type": "Organization",')
  [void]$jsonLines.Add('      "name": "FREIRAUM",')
  [void]$jsonLines.Add(('      "url": "{0}/"' -f $script:FreiraumSiteOrigin))
  [void]$jsonLines.Add("    },")
  [void]$jsonLines.Add('    "mainEntityOfPage": {')
  [void]$jsonLines.Add('      "@type": "WebPage",')
  [void]$jsonLines.Add(('      "@id": "{0}"' -f (Escape-JsonString $canonical)))
  if ($section) {
    [void]$jsonLines.Add("    },")
    [void]$jsonLines.Add(('    "articleSection": "{0}"' -f (Escape-JsonString $section)))
  }
  else {
    [void]$jsonLines.Add("    }")
  }
  [void]$jsonLines.Add("  }")

  [void]$lines.Add('  <script type="application/ld+json">')
  foreach ($jl in $jsonLines) { [void]$lines.Add($jl) }
  [void]$lines.Add('  </script>')
  [void]$lines.Add($script:FreiraumSeoEnd)

  return ($lines -join "`n")
}

function Get-ArticleHtmlPath {
  param(
    $Article,
    [string]$Root = (Get-FreiraumRoot)
  )
  if (-not $Article.href -or $Article.href -notmatch '^artikel/.+\.html$') { return $null }
  return (Join-Path $Root ($Article.href -replace '/', [IO.Path]::DirectorySeparatorChar))
}

function Update-ArticleHtmlSeo {
  param(
    $Article,
    [string]$Root = (Get-FreiraumRoot),
    [string]$AssetVersion = (Get-AssetVersion -Root $Root)
  )

  $path = Get-ArticleHtmlPath -Article $Article -Root $Root
  if (-not $path) { throw "Article $($Article.id) has no artikel/*.html href" }
  if (-not (Test-Path $path)) { throw "Missing HTML file: $path" }

  $html = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  $seoBlock = New-ArticleSeoBlock -Article $Article

  if ($html.Contains($script:FreiraumSeoStart)) {
    $pattern = '(?s)' + [regex]::Escape($script:FreiraumSeoStart) + '.*?' + [regex]::Escape($script:FreiraumSeoEnd)
    $m = [regex]::Match($html, $pattern)
    if (-not $m.Success) { throw "SEO markers found but block could not be matched in $path" }
    $html = $html.Substring(0, $m.Index) + $seoBlock + $html.Substring($m.Index + $m.Length)
  }
  else {
    # Migrate: inject SEO markers after viewport meta, replace existing title/description/canonical/og/twitter/jsonld
    $html = [regex]::Replace($html, '(?s)<title>.*?</title>\s*', '')
    $html = [regex]::Replace($html, '(?s)<meta\s+name="description"[^>]*>\s*', '')
    $html = [regex]::Replace($html, '(?s)<link\s+rel="canonical"[^>]*>\s*', '')
    $html = [regex]::Replace($html, '(?s)<meta\s+property="og:[^"]+"[^>]*>\s*', '')
    $html = [regex]::Replace($html, '(?s)<meta\s+property="article:[^"]+"[^>]*>\s*', '')
    $html = [regex]::Replace($html, '(?s)<meta\s+name="twitter:[^"]+"[^>]*>\s*', '')
    $html = [regex]::Replace($html, '(?s)<script\s+type="application/ld\+json">.*?</script>\s*', '')

    $viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    $vIdx = $html.IndexOf($viewport)
    if ($vIdx -lt 0) {
      throw "Could not find viewport meta in $path"
    }
    $insertAt = $vIdx + $viewport.Length
    $html = $html.Insert($insertAt, "`n$seoBlock")
  }

  $html = [regex]::Replace($html, '(\?v=)[0-9a-zA-Z]+', "`${1}$AssetVersion")

  # Keep visible article header fields in sync with articles.js
  if ($Article.title) {
    $titleMatch = [regex]::Match($html, '(?s)(<h1 class="article-title">)(.*?)(</h1>)')
    if ($titleMatch.Success) {
      $html = $html.Substring(0, $titleMatch.Groups[2].Index) + $Article.title + $html.Substring($titleMatch.Groups[2].Index + $titleMatch.Groups[2].Length)
    }
  }
  if ($Article.teaser) {
    $deckMatch = [regex]::Match($html, '(?s)(<p class="article-deck">)(.*?)(</p>)')
    if ($deckMatch.Success) {
      $html = $html.Substring(0, $deckMatch.Groups[2].Index) + $Article.teaser + $html.Substring($deckMatch.Groups[2].Index + $deckMatch.Groups[2].Length)
    }
  }
  if ($Article.date) {
    $display = Format-GermanDate $Article.date
    $html = [regex]::Replace(
      $html,
      '(?s)<time datetime="[^"]*">[^<]*</time>',
      "<time datetime=`"$($Article.date)`">$display</time>",
      1
    )
  }

  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $html, $utf8)
  return $path
}

function New-ArticleHtmlFile {
  param(
    $Article,
    [string]$BodyHtml,
    [string]$Root = (Get-FreiraumRoot),
    [string]$AssetVersion = (Get-AssetVersion -Root $Root)
  )

  $templatePath = Join-Path $Root "tools\templates\article.template.html"
  if (-not (Test-Path $templatePath)) { throw "Missing template: $templatePath" }
  $template = [IO.File]::ReadAllText($templatePath, [Text.Encoding]::UTF8)

  $seoBlock = New-ArticleSeoBlock -Article $Article
  $authorDisplay = Get-AuthorDisplayName $Article
  $dateDisplay = Format-GermanDate $Article.date
  $label = if ($Article.label) { $Article.label } else { "Artikel" }

  $html = $template
  $html = $html.Replace("{{SEO_BLOCK}}", $seoBlock)
  $html = $html.Replace("{{ASSET_VERSION}}", $AssetVersion)
  $html = $html.Replace("{{ARTICLE_ID}}", $Article.id)
  $html = $html.Replace("{{LABEL}}", (Escape-HtmlAttr $label))
  $html = $html.Replace("{{TITLE}}", $Article.title)
  $html = $html.Replace("{{TEASER}}", $Article.teaser)
  $html = $html.Replace("{{AUTHOR_DISPLAY}}", $authorDisplay)
  $html = $html.Replace("{{DATE_ISO}}", $Article.date)
  $html = $html.Replace("{{DATE_DISPLAY}}", $dateDisplay)
  $html = $html.Replace("{{BODY}}", $BodyHtml.Trim())

  $path = Get-ArticleHtmlPath -Article $Article -Root $Root
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $html, $utf8)
  return $path
}

function ConvertTo-JsString {
  param([string]$Value)
  if ($null -eq $Value) { return '""' }
  $escaped = $Value -replace '\\', '\\' -replace '"', '\"' -replace "`r", '' -replace "`n", '\n'
  return "`"$escaped`""
}

function ConvertTo-JsStringArray {
  param([string[]]$Items)
  if (-not $Items -or $Items.Count -eq 0) { return "[]" }
  $parts = $Items | ForEach-Object { ConvertTo-JsString $_ }
  return "[" + ($parts -join ", ") + "]"
}

function Format-ArticleJsObject {
  param($Article)
  $dateModifiedLine = if ($Article.dateModified) {
    "    dateModified: $(ConvertTo-JsString $Article.dateModified),"
  } else {
    "    dateModified: null,"
  }
  $imageTone = if ($Article.imageTone) { $Article.imageTone } else { "default" }
  $caption = if ($null -ne $Article.imageCaption) { $Article.imageCaption } else { "" }
  $lines = @(
    "  {",
    "    id: $(ConvertTo-JsString $Article.id),",
    "    title: $(ConvertTo-JsString $Article.title),",
    "    seoTitle: $(ConvertTo-JsString (Get-ArticleSeoTitle $Article)),",
    "    seoDescription:",
    "      $(ConvertTo-JsString (Get-ArticleSeoDescription $Article)),",
    "    teaser:",
    "      $(ConvertTo-JsString $Article.teaser),",
    "    label: $(ConvertTo-JsString $Article.label),",
    "    author: $(ConvertTo-JsString $Article.author),",
    "    date: $(ConvertTo-JsString $Article.date),",
    $dateModifiedLine,
    "    href: $(ConvertTo-JsString $Article.href),",
    "    image: $(ConvertTo-JsString $Article.image),",
    "    imageAlt: $(ConvertTo-JsString $Article.imageAlt),",
    "    imageCaption: $(ConvertTo-JsString $caption),",
    "    imageTone: $(ConvertTo-JsString $imageTone),",
    "    topics: $(ConvertTo-JsStringArray $Article.topics),",
    "    tags: $(ConvertTo-JsStringArray $Article.tags),",
    "    published: $(if ($Article.published -eq $false) { 'false' } else { 'true' })",
    "  }"
  )
  return ($lines -join "`n")
}

function Add-ArticleToArticlesJs {
  param(
    $Article,
    [string]$Root = (Get-FreiraumRoot)
  )
  $path = Join-Path $Root "articles.js"
  $raw = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  if ($raw -match [regex]::Escape("id: `"$($Article.id)`"")) {
    throw "Article id '$($Article.id)' already exists in articles.js"
  }
  $marker = "window.FREIRAUM_ARTICLES = ["
  $idx = $raw.IndexOf($marker)
  if ($idx -lt 0) { throw "FREIRAUM_ARTICLES marker missing" }
  $insertAt = $idx + $marker.Length
  $obj = Format-ArticleJsObject -Article $Article
  $insertion = "`n$obj,"
  $newRaw = $raw.Insert($insertAt, $insertion)
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $newRaw, $utf8)
}

function Test-ArticleSeoCompleteness {
  param(
    $Article,
    [string]$Root = (Get-FreiraumRoot)
  )

  $issues = New-Object System.Collections.Generic.List[string]
  $path = Get-ArticleHtmlPath -Article $Article -Root $Root

  if (-not $Article.published) {
    return [pscustomobject]@{ Id = $Article.id; Ok = $true; Issues = @("skipped unpublished"); Path = $path }
  }
  if (-not $path) {
    return [pscustomobject]@{ Id = $Article.id; Ok = $true; Issues = @("no full HTML page (stub)"); Path = $null }
  }
  if (-not (Test-Path $path)) {
    $issues.Add("HTML file missing: $path")
    return [pscustomobject]@{ Id = $Article.id; Ok = $false; Issues = @($issues); Path = $path }
  }

  $html = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  $titleCount = ([regex]::Matches($html, '<title>')).Count
  $descCount = ([regex]::Matches($html, '<meta\s+name="description"')).Count
  $canonCount = ([regex]::Matches($html, '<link\s+rel="canonical"')).Count

  if ($titleCount -ne 1) { $issues.Add("expected exactly one <title>, found $titleCount") }
  if ($descCount -ne 1) { $issues.Add("expected exactly one meta description, found $descCount") }
  if ($canonCount -ne 1) { $issues.Add("expected exactly one canonical, found $canonCount") }

  $canon = [regex]::Match($html, '<link\s+rel="canonical"\s+href="([^"]+)"').Groups[1].Value
  if ($canon -notmatch '^https://magazin-freiraum\.de/') {
    $issues.Add("canonical must use https://magazin-freiraum.de/")
  }
  if ($html -match 'kaisy84\.github\.io') {
    $issues.Add("SEO metadata must not contain kaisy84.github.io")
  }

  $ogImage = [regex]::Match($html, '<meta\s+property="og:image"\s+content="([^"]+)"').Groups[1].Value
  if ($Article.image) {
    if (-not $ogImage) { $issues.Add("og:image missing") }
    elseif ($ogImage -notmatch '^https://magazin-freiraum\.de/') {
      $issues.Add("og:image must be absolute on magazin-freiraum.de")
    }
  }

  if ($html -notmatch 'twitter:card"\s+content="summary_large_image"') {
    $issues.Add("twitter:card summary_large_image missing")
  }

  $ldMatch = [regex]::Match($html, '(?s)<script\s+type="application/ld\+json">\s*(\{.*?\})\s*</script>')
  if (-not $ldMatch.Success) {
    $issues.Add("JSON-LD block missing")
  }
  else {
    try {
      $ld = $ldMatch.Groups[1].Value | ConvertFrom-Json
      if ($ld.'@type' -ne "Article") { $issues.Add("JSON-LD @type must be Article") }
      if (-not $ld.headline) { $issues.Add("JSON-LD headline missing") }
      if (-not $ld.datePublished) { $issues.Add("JSON-LD datePublished missing") }
      elseif ($ld.datePublished -ne $Article.date) {
        $issues.Add("JSON-LD datePublished mismatch (html=$($ld.datePublished), articles.js=$($Article.date))")
      }
      if (-not $ld.author) { $issues.Add("JSON-LD author missing") }
      if (-not $ld.publisher) { $issues.Add("JSON-LD publisher missing") }
      if (-not $ld.mainEntityOfPage) { $issues.Add("JSON-LD mainEntityOfPage missing") }
      if ($Article.dateModified) {
        if (-not $ld.dateModified) { $issues.Add("dateModified set in articles.js but missing in JSON-LD") }
      }
      else {
        if ($ld.PSObject.Properties.Name -contains "dateModified" -and $ld.dateModified) {
          $issues.Add("dateModified present in JSON-LD without articles.js value")
        }
      }
    }
    catch {
      $issues.Add("JSON-LD is not valid JSON: $($_.Exception.Message)")
    }
  }

  # Cover image is optional: without `image`, the site shows the shared placeholder.
  if ($Article.image -and -not $Article.imageAlt) { $issues.Add("articles.js imageAlt missing when image is set") }
  if ($html -notmatch 'data-reading-time') { $issues.Add("reading time placeholder missing") }

  $bodyMatch = [regex]::Match($html, '(?s)<div class="article-body">(.*?)</div>')
  if (-not $bodyMatch.Success -or $bodyMatch.Groups[1].Value.Trim().Length -lt 40) {
    $issues.Add("article body missing or too short")
  }
  else {
    $minutes = Get-ReadingMinutesFromHtml $bodyMatch.Groups[1].Value
    if ($minutes -lt 1) { $issues.Add("reading time could not be calculated") }
  }

  if ($html -notmatch 'figure class="article-hero"') {
    $issues.Add("article hero figure missing")
  }

  return [pscustomobject]@{
    Id     = $Article.id
    Ok     = ($issues.Count -eq 0)
    Issues = @($issues)
    Path   = $path
  }
}

function Sync-PublishedArticleSeo {
  param(
    [string]$Root = (Get-FreiraumRoot),
    [string]$Id,
    [switch]$All
  )

  $articles = @(Get-FreiraumPublishedFullPages -Root $Root)
  # Always wrap: a single-object pipeline result is not an array under Set-StrictMode.
  $targets = @(
    if ($Id) {
      $articles | Where-Object { $_.id -eq $Id }
    }
    elseif ($All) {
      $articles
    }
    else {
      throw "Specify -Id or -All"
    }
  )

  if ($targets.Count -eq 0) { throw "No matching articles found" }

  $version = Get-AssetVersion -Root $Root
  $results = @()
  foreach ($article in $targets) {
    $path = Update-ArticleHtmlSeo -Article $article -Root $Root -AssetVersion $version
    $check = Test-ArticleSeoCompleteness -Article $article -Root $Root
    $results += [pscustomobject]@{
      Id     = $article.id
      Path   = $path
      Ok     = $check.Ok
      Issues = $check.Issues
    }
  }

  Update-FreiraumSitemap -Root $Root | Out-Null
  Update-FreiraumRobotsTxt -Root $Root | Out-Null
  return $results
}

function Get-ArticleLastmod {
  param($Article)
  $modified = if ($null -ne $Article.dateModified) { ([string]$Article.dateModified).Trim() } else { "" }
  if ($modified) { return $modified }
  return ([string]$Article.date).Trim()
}

function Get-FileLastmod {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return (Get-Date -Format "yyyy-MM-dd") }
  return ([IO.File]::GetLastWriteTime($Path).ToString("yyyy-MM-dd"))
}

function Update-FreiraumSitemap {
  param([string]$Root = (Get-FreiraumRoot))

  $origin = $script:FreiraumSiteOrigin
  $entries = New-Object System.Collections.Generic.List[object]

  # Homepage
  $entries.Add([pscustomobject]@{
    Loc     = "$origin/"
    Lastmod = Get-FileLastmod (Join-Path $Root "index.html")
    Type    = "home"
  })

  # Published full article and Standpunkt pages only
  $articles = @(Get-FreiraumPublishedFullPages -Root $Root)
  foreach ($article in ($articles | Sort-Object date -Descending)) {
    $htmlPath = Get-ArticleHtmlPath -Article $article -Root $Root
    if (-not $htmlPath -or -not (Test-Path $htmlPath)) { continue }
    $entries.Add([pscustomobject]@{
      Loc     = Get-AbsoluteUrl $article.href
      Lastmod = Get-ArticleLastmod $article
      Type    = "article"
    })
  }

  # Existing topic pages that are actually on disk
  $topicsDir = Join-Path $Root "themen"
  if (Test-Path $topicsDir) {
    Get-ChildItem $topicsDir -Filter "*.html" | Sort-Object Name | ForEach-Object {
      $rel = "themen/$($_.Name)"
      $entries.Add([pscustomobject]@{
        Loc     = Get-AbsoluteUrl $rel
        Lastmod = Get-FileLastmod $_.FullName
        Type    = "topic"
      })
    }
  }

  # Standalone information pages
  foreach ($page in @("kontakt.html", "impressum.html", "datenschutz.html")) {
    $full = Join-Path $Root $page
    if (-not (Test-Path $full)) { continue }
    $entries.Add([pscustomobject]@{
      Loc     = Get-AbsoluteUrl $page
      Lastmod = Get-FileLastmod $full
      Type    = "info"
    })
  }

  # Deduplicate by loc, keep first
  $seen = @{}
  $unique = New-Object System.Collections.Generic.List[object]
  foreach ($entry in $entries) {
    if ($seen.ContainsKey($entry.Loc)) { continue }
    if ($entry.Loc -match 'github\.io') { throw "Sitemap must not contain github.io URLs" }
    if ($entry.Loc -notmatch '^https://magazin-freiraum\.de/') {
      throw "Sitemap URL must use magazin-freiraum.de: $($entry.Loc)"
    }
    if ($entry.Loc -match '#') { continue }
    $seen[$entry.Loc] = $true
    $unique.Add($entry)
  }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
  [void]$sb.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  foreach ($entry in $unique) {
    [void]$sb.AppendLine("  <url>")
    [void]$sb.AppendLine("    <loc>$($entry.Loc)</loc>")
    if ($entry.Lastmod) {
      [void]$sb.AppendLine("    <lastmod>$($entry.Lastmod)</lastmod>")
    }
    [void]$sb.AppendLine("  </url>")
  }
  [void]$sb.AppendLine("</urlset>")

  $outPath = Join-Path $Root "sitemap.xml"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($outPath, $sb.ToString(), $utf8)

  return [pscustomobject]@{
    Path     = $outPath
    UrlCount = $unique.Count
    Entries  = @($unique.ToArray())
  }
}

function Update-FreiraumRobotsTxt {
  param([string]$Root = (Get-FreiraumRoot))

  $content = @(
    "User-agent: *"
    "Allow: /"
    ""
    "Sitemap: $($script:FreiraumSiteOrigin)/sitemap.xml"
    ""
  ) -join "`n"

  $outPath = Join-Path $Root "robots.txt"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($outPath, $content, $utf8)
  return $outPath
}

function Publish-NewFreiraumArticle {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Teaser,
    [Parameter(Mandatory = $true)][string]$BodyFile,
    [string]$SeoTitle,
    [string]$SeoDescription,
    [string]$Label = "Analyse",
    [string]$Author = "Redaktion FREIRAUM",
    [string]$Date = (Get-Date -Format "yyyy-MM-dd"),
    [string]$DateModified,
    [string[]]$Topics,
    [string[]]$Tags,
    [Parameter(Mandatory = $true)][string]$Image,
    [Parameter(Mandatory = $true)][string]$ImageAlt,
    [string]$ImageTone = "default",
    [string]$Root = (Get-FreiraumRoot)
  )

  if (-not (Test-Path $BodyFile)) { throw "Body file not found: $BodyFile" }
  $body = [IO.File]::ReadAllText((Resolve-Path $BodyFile), [Text.Encoding]::UTF8)

  $article = [pscustomobject]@{
    id             = $Id
    title          = $Title
    seoTitle       = $SeoTitle
    seoDescription = $SeoDescription
    teaser         = $Teaser
    label          = $Label
    author         = $Author
    date           = $Date
    dateModified   = $DateModified
    href           = "artikel/$Id.html"
    image          = $Image
    imageAlt       = $ImageAlt
    imageCaption   = ""
    imageTone      = $ImageTone
    topics         = @($Topics)
    tags           = @($Tags)
    published      = $true
  }

  if (-not (Get-ArticleSeoDescription $article)) {
    throw "seoDescription/teaser missing"
  }
  if (-not $article.image) { throw "image is required" }
  if (-not $article.imageAlt) { throw "imageAlt is required" }

  Add-ArticleToArticlesJs -Article $article -Root $Root
  $path = New-ArticleHtmlFile -Article $article -BodyHtml $body -Root $Root
  Update-FreiraumSitemap -Root $Root | Out-Null
  Update-FreiraumRobotsTxt -Root $Root | Out-Null
  $check = Test-ArticleSeoCompleteness -Article $article -Root $Root
  return [pscustomobject]@{
    Id     = $Id
    Path   = $path
    Ok     = $check.Ok
    Issues = $check.Issues
  }
}

Export-ModuleMember -Function @(
  "Get-FreiraumRoot",
  "Get-AssetVersion",
  "Get-FreiraumArticles",
  "Get-FreiraumOpinions",
  "Get-FreiraumPublishedFullPages",
  "Get-ArticleSeoTitle",
  "Get-ArticleSeoDescription",
  "Get-AbsoluteUrl",
  "Get-ReadingMinutesFromHtml",
  "New-ArticleSeoBlock",
  "Update-ArticleHtmlSeo",
  "New-ArticleHtmlFile",
  "Add-ArticleToArticlesJs",
  "Test-ArticleSeoCompleteness",
  "Sync-PublishedArticleSeo",
  "Publish-NewFreiraumArticle",
  "Update-FreiraumSitemap",
  "Update-FreiraumRobotsTxt"
)
