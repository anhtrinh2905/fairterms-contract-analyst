# Set all GitHub Actions secrets for FairTerms CI/CD.
# Prerequisite: gh auth login (one time)
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy\set-github-secrets.ps1
#   powershell -ExecutionPolicy Bypass -File deploy\set-github-secrets.ps1 -EnvOnly
#
# Or with GitHub token directly (skip gh login):
#   $env:GITHUB_TOKEN = "ghp_..."
#   powershell -ExecutionPolicy Bypass -File deploy\set-github-secrets.ps1 -EnvOnly

param(
    [switch]$EnvOnly
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Repo = 'anhtrinh2905/fairterms-contract-analyst'

function Set-GhSecret($Name, $Value) {
    if ($env:GITHUB_TOKEN) {
        $Value | gh secret set $Name --repo $Repo
    } else {
        $Value | gh secret set $Name --repo $Repo
    }
    Write-Host "[ok] $Name"
}

if ($env:GITHUB_TOKEN) {
    $env:GH_TOKEN = $env:GITHUB_TOKEN
} else {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
        $ghPath = Join-Path ${env:ProgramFiles} 'GitHub CLI\gh.exe'
        if (Test-Path $ghPath) {
            $env:Path = "$(Split-Path $ghPath -Parent);$env:Path"
            $gh = Get-Command gh -ErrorAction SilentlyContinue
        }
    }
    if (-not $gh) { throw 'Install GitHub CLI: winget install GitHub.cli' }
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Run first: gh auth login  (or set GITHUB_TOKEN)' }
}

$devEnv = Get-Content (Join-Path $Root 'deploy\.env.dev') -Raw
$mainEnv = Get-Content (Join-Path $Root 'deploy\.env.main') -Raw

Set-GhSecret 'DEV_ENV_FILE' $devEnv
Set-GhSecret 'MAIN_ENV_FILE' $mainEnv

if ($EnvOnly) {
    Write-Host ''
    Write-Host 'Env secrets updated for anhtrinh2905/fairterms-contract-analyst'
    exit 0
}

$sshKeyPath = Join-Path $Root 'deploy\ssh\fairterms-deploy'
if (-not (Test-Path $sshKeyPath)) { throw "Missing SSH key: $sshKeyPath" }
$sshKey = Get-Content $sshKeyPath -Raw

Set-GhSecret 'SSH_HOST' '52.77.14.171'
Set-GhSecret 'SSH_USER' 'ubuntu'
Set-GhSecret 'SSH_PRIVATE_KEY' $sshKey
# Images push to GHCR using the built-in GITHUB_TOKEN — no Docker Hub secret needed.

Write-Host ''
Write-Host 'All secrets set for anhtrinh2905/fairterms-contract-analyst'
