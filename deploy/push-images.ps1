# Build, tag, and push all 4 images to GHCR (manual fallback; CI does this automatically).
# Prerequisite: docker login ghcr.io -u anhtrinh2905  (use a GitHub PAT with write:packages)
$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "build-images.ps1")

$repo = "ghcr.io/anhtrinh2905/fairterms"
$tags = @(
    @{ Local = "fairterms-backend:dev";  Remote = "backend-dev" },
    @{ Local = "fairterms-backend:main"; Remote = "backend-main" },
    @{ Local = "fairterms-frontend:dev"; Remote = "frontend-dev" },
    @{ Local = "fairterms-frontend:main"; Remote = "frontend-main" }
)

foreach ($t in $tags) {
    $remote = "${repo}/$($t.Remote)"
    Write-Host "==> Tag + push $remote"
    docker tag $t.Local $remote
    docker push $remote
}

Write-Host ""
Write-Host "Pushed to https://github.com/anhtrinh2905?tab=packages&repo_name=fairterms"
