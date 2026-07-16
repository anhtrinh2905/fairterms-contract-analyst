# Build, tag, and push all 4 images to Docker Hub
$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "build-images.ps1")

$repo = "anhquan0903/fair_terms"
$tags = @(
    @{ Local = "fairterms-backend:dev";  Remote = "backend-dev" },
    @{ Local = "fairterms-backend:main"; Remote = "backend-main" },
    @{ Local = "fairterms-frontend:dev"; Remote = "frontend-dev" },
    @{ Local = "fairterms-frontend:main"; Remote = "frontend-main" }
)

foreach ($t in $tags) {
    $remote = "${repo}:$($t.Remote)"
    Write-Host "==> Tag + push $remote"
    docker tag $t.Local $remote
    docker push $remote
}

Write-Host ""
Write-Host "Pushed to https://hub.docker.com/r/anhquan0903/fair_terms"
