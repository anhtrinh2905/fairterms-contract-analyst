# Build all 4 images: backend/frontend x dev/main tags
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Deploy = Join-Path $Root "deploy"

function Get-ApiUrlFromEnvFile {
    param([string]$Path, [string]$Default)
    if (-not (Test-Path $Path)) { return $Default }
    $line = Get-Content $Path | Where-Object { $_ -match '^NEXT_PUBLIC_BACKEND_URL=' } | Select-Object -First 1
    if ($line) { return ($line -split '=', 2)[1].Trim() }
    return $Default
}

$devApiUrl = Get-ApiUrlFromEnvFile (Join-Path $Deploy ".env.dev") "http://localhost:8000"
$mainApiUrl = Get-ApiUrlFromEnvFile (Join-Path $Deploy ".env.main") "https://api.example.com"

Write-Host "==> fairterms-backend:dev"
docker build -t fairterms-backend:dev (Join-Path $Root "src/backend")

Write-Host "==> fairterms-backend:main"
docker build -t fairterms-backend:main (Join-Path $Root "src/backend")

Write-Host "==> fairterms-frontend:dev (API=$devApiUrl)"
docker build --build-arg "NEXT_PUBLIC_BACKEND_URL=$devApiUrl" -t fairterms-frontend:dev (Join-Path $Root "src/frontend")

Write-Host "==> fairterms-frontend:main (API=$mainApiUrl)"
docker build --build-arg "NEXT_PUBLIC_BACKEND_URL=$mainApiUrl" -t fairterms-frontend:main (Join-Path $Root "src/frontend")

Write-Host ""
Write-Host "Done. Images:"
docker images --format "  {{.Repository}}:{{.Tag}}" | Select-String "^  fairterms-"
