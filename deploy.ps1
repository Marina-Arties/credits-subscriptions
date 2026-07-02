param(
    [string]$message = "Update"
)
Set-Location $PSScriptRoot
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\Git\cmd;" + $env:Path
git add .
git commit -m $message
git push
Write-Host "Done! Site updated: https://marina-arties.github.io/credits-subscriptions/" -ForegroundColor Green
