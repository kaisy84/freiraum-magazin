<#
.SYNOPSIS
  Publish or sync FREIRAUM articles with static SEO HTML.

.DESCRIPTION
  Central article workflow. Metadata comes from articles.js.
  Full article pages in /artikel/ always receive a complete static SEO <head>
  (visible in view-source).

.EXAMPLE
  # Sync SEO for all published full articles
  .\tools\publish-article.ps1 -SyncAll

.EXAMPLE
  # Sync one article after editing articles.js
  .\tools\publish-article.ps1 -SyncId eltern-schweigen

.EXAMPLE
  # Create a new article (updates articles.js + writes artikel/<id>.html)
  .\tools\publish-article.ps1 -New -Id "mein-artikel" -Title "..." -Teaser "..." `
    -BodyFile ".\drafts\mein-artikel.body.html" `
    -Image "assets/images/mein-artikel.jpg" -ImageAlt "..." `
    -Topics "Schule & Bildung" -Tags "Schule","Bildungspolitik"
#>
[CmdletBinding(DefaultParameterSetName = "SyncAll")]
param(
  [Parameter(ParameterSetName = "SyncAll")]
  [switch]$SyncAll,

  [Parameter(ParameterSetName = "SyncId", Mandatory = $true)]
  [string]$SyncId,

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [switch]$New,

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [string]$Id,

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [string]$Title,

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [string]$Teaser,

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [string]$BodyFile,

  [Parameter(ParameterSetName = "New")]
  [string]$SeoTitle,

  [Parameter(ParameterSetName = "New")]
  [string]$SeoDescription,

  [Parameter(ParameterSetName = "New")]
  [string]$Label = "Analyse",

  [Parameter(ParameterSetName = "New")]
  [string]$Author = "Redaktion FREIRAUM",

  [Parameter(ParameterSetName = "New")]
  [string]$Date = (Get-Date -Format "yyyy-MM-dd"),

  [Parameter(ParameterSetName = "New")]
  [string]$DateModified,

  [Parameter(ParameterSetName = "New")]
  [string[]]$Topics = @(),

  [Parameter(ParameterSetName = "New")]
  [string[]]$Tags = @(),

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [string]$Image,

  [Parameter(ParameterSetName = "New", Mandatory = $true)]
  [string]$ImageAlt,

  [Parameter(ParameterSetName = "New")]
  [string]$ImageTone = "default",

  [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"
Import-Module -Force (Join-Path $PSScriptRoot "FreiraumPublish.psm1")

$root = Get-FreiraumRoot
$results = @()

if ($PSCmdlet.ParameterSetName -eq "New" -or $New) {
  $results = @(
    Publish-NewFreiraumArticle `
      -Id $Id `
      -Title $Title `
      -Teaser $Teaser `
      -BodyFile $BodyFile `
      -SeoTitle $SeoTitle `
      -SeoDescription $SeoDescription `
      -Label $Label `
      -Author $Author `
      -Date $Date `
      -DateModified $DateModified `
      -Topics $Topics `
      -Tags $Tags `
      -Image $Image `
      -ImageAlt $ImageAlt `
      -ImageTone $ImageTone `
      -Root $root
  )
}
elseif ($SyncId) {
  $results = @(Sync-PublishedArticleSeo -Root $root -Id $SyncId)
}
else {
  $results = @(Sync-PublishedArticleSeo -Root $root -All)
}

$results | Format-Table -AutoSize Id, Ok, Path | Out-Host

$failed = @($results | Where-Object { -not $_.Ok })
if (-not $SkipValidation -and $failed.Count -gt 0) {
  Write-Host ""
  Write-Host "ARTICLE NOT COMPLETE - fix before push:" -ForegroundColor Red
  foreach ($item in $failed) {
    Write-Host ("- {0}" -f $item.Id) -ForegroundColor Red
    foreach ($issue in $item.Issues) {
      Write-Host ("    * {0}" -f $issue)
    }
  }
  exit 1
}

if (-not $SkipValidation) {
  Write-Host ""
  Write-Host "All targeted articles are SEO-complete (static HTML)." -ForegroundColor Green
}

exit 0
