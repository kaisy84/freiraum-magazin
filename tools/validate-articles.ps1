<#
.SYNOPSIS
  Validate static SEO completeness for published FREIRAUM articles.

.EXAMPLE
  .\tools\validate-articles.ps1
  .\tools\validate-articles.ps1 -Id eltern-schweigen
#>
[CmdletBinding()]
param(
  [string]$Id
)

$ErrorActionPreference = "Stop"
Import-Module -Force (Join-Path $PSScriptRoot "FreiraumPublish.psm1")

$root = Get-FreiraumRoot
$articles = @(Get-FreiraumArticles -Root $root | Where-Object {
  $_.published -and $_.href -match '^artikel/.+\.html$'
})

if ($Id) {
  $articles = @($articles | Where-Object { $_.id -eq $Id })
  if ($articles.Count -eq 0) { throw "No published full article with id '$Id'" }
}

$results = @()
foreach ($article in $articles) {
  $results += Test-ArticleSeoCompleteness -Article $article -Root $root
}

$results | Format-Table -AutoSize Id, Ok, Path | Out-Host

$failed = @($results | Where-Object { -not $_.Ok })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "VALIDATION FAILED - article(s) not ready to publish:" -ForegroundColor Red
  foreach ($item in $failed) {
    Write-Host ("- {0}" -f $item.Id) -ForegroundColor Red
    foreach ($issue in $item.Issues) {
      Write-Host ("    * {0}" -f $issue)
    }
  }
  exit 1
}

Write-Host ""
Write-Host ("OK - {0} article page(s) passed SEO completeness checks." -f $results.Count) -ForegroundColor Green
exit 0
