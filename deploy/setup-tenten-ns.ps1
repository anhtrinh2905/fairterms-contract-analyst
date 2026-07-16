# Point c2-app-145.io.vn nameservers to Google Cloud DNS via Tenten API.
# Usage: powershell -ExecutionPolicy Bypass -File deploy\setup-tenten-ns.ps1
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root 'deploy\.env.tenten'
if (-not (Test-Path $EnvFile)) {
    throw "Create $EnvFile from deploy\.env.tenten.example (API key from id.tenten.vn)"
}

Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        Set-Variable -Name $matches[1].Trim() -Value $matches[2].Trim()
    }
}

foreach ($var in @('TENTEN_API_URL', 'TENTEN_API_USER', 'TENTEN_API_KEY')) {
    if (-not (Get-Variable -Name $var -ErrorAction SilentlyContinue) -or -not (Get-Variable -Name $var).Value) {
        throw "Missing $var in deploy\.env.tenten"
    }
}

$body = @{
    api_key    = $TENTEN_API_KEY
    api_user   = $TENTEN_API_USER
    domainName = 'c2-app-145.io.vn'
    domainDNS1 = 'ns-cloud-d1.googledomains.com'
    domainIP1  = ''
    domainDNS2 = 'ns-cloud-d2.googledomains.com'
    domainIP2  = ''
    domainDNS3 = 'ns-cloud-d3.googledomains.com'
    domainIP3  = ''
    domainDNS4 = 'ns-cloud-d4.googledomains.com'
    domainIP4  = ''
}

$uri = ($TENTEN_API_URL.TrimEnd('/')) + '/nameserver.json'
Write-Host "==> POST $uri"
$response = Invoke-RestMethod -Method Post -Uri $uri -Body $body
$response | ConvertTo-Json -Depth 5
if ($response.status -ne 'success') {
    throw "Tenten API failed: $($response.error_message)"
}
Write-Host '==> Nameservers updated. Wait 15-60 min for DNS propagation.'
