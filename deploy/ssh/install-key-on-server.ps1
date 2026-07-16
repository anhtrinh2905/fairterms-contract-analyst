# Install public key on server — needs existing SSH access (GCP console or old key)
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $Root "deploy\.env.deploy"
$PubKey = Join-Path $PSScriptRoot "fairterms-deploy.pub"
$PrivKey = Join-Path $PSScriptRoot "fairterms-deploy"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Create deploy/.env.deploy with SERVER_HOST and SERVER_USER"
}

function Get-Var($name) {
    $line = Get-Content $EnvFile | Where-Object { $_ -match "^${name}=" } | Select-Object -First 1
    if ($line) { return ($line -split "=", 2)[1].Trim().Trim('"') }
    return ""
}

$host_ = Get-Var "SERVER_HOST"
$user = Get-Var "SERVER_USER"
$port = Get-Var "SERVER_PORT"
if (-not $user) { $user = "fairterms-deploy" }
if (-not $port) { $port = "22" }

if (-not $host_) { Write-Error "Set SERVER_HOST in deploy/.env.deploy" }

$pubLine = (Get-Content $PubKey -Raw).Trim()

Write-Host "Installing key for ${user}@${host_}..."
$cmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubLine' > ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh -i $PrivKey -p $port -o IdentitiesOnly=yes "${user}@${host_}" $cmd

Write-Host "Done. Test: ssh -F deploy/ssh/config fairterms"
