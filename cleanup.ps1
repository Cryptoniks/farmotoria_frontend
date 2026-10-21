# Очистка репозитория farmotoria_frontend после оптимизации.
# Лишние файлы НЕ удаляются, а переносятся в папку _to_delete (с сохранением структуры),
# чтобы их можно было проверить. Когда убедитесь, что всё работает, удалите _to_delete.
#
# Запуск из корня проекта:
#   powershell -ExecutionPolicy Bypass -File .\cleanup.ps1
# Сразу удалить без переноса:
#   powershell -ExecutionPolicy Bypass -File .\cleanup.ps1 -Purge

param([switch]$Purge)

$root = $PSScriptRoot
$trash = Join-Path $root "_to_delete"

$items = @(
    "public\vite.svg"
    "src\App.css"
    "src\assets\react.svg"
    "src\features\farm\AnimalsPage.jsx"
    "src\styles\FarmPage.css"
    "src\styles\InventoryPage.css"
    "src\styles\LeftMenu.css"
    "src\styles\LoginPage.css"
    "src\styles\MarketPage.css"
    "src\styles\ProfilePage.css"
    "src\styles\RegisterPage.css"
    "src\styles\SeedShopPage.css"
    "src\assets\logo.png"
    "src\assets\buildings\barn.png"
    "src\assets\buildings\barn2.png"
    "src\assets\buildings\barn3.png"
    "src\assets\buildings\house.png"
    "src\assets\buildings\warehouse.png"
    "src\assets\plants\wheat.png"
    "src\assets\plants\wheat-seed.png"
    "src\assets\plants\corn.png"
    "src\assets\plants\corn-seed.png"
    "src\assets\plants\tomato.png"
    "src\assets\plants\tomato-seed.png"
    "src\assets\plants\sunflower.png"
    "src\assets\plants\sunflower-seed.png"
    "src\styles"
    "src\pages"
)

$moved = 0
foreach ($rel in $items) {
    $src = Join-Path $root $rel
    if (-not (Test-Path -LiteralPath $src)) { continue }
    if ($Purge) {
        Remove-Item -LiteralPath $src -Recurse -Force
    } else {
        $dst = Join-Path $trash $rel
        New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
        Move-Item -LiteralPath $src -Destination $dst -Force
    }
    $moved++
    Write-Host "  - $rel"
}

# Новый CI-конфиг: ci.new.yml -> .github\workflows\ci.yml
$newCi = Join-Path $root "ci.new.yml"
if (Test-Path -LiteralPath $newCi) {
    $ci = Join-Path $root ".github\workflows\ci.yml"
    if ((Test-Path -LiteralPath $ci) -and -not $Purge) {
        $dst = Join-Path $trash ".github\workflows\ci.yml"
        New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
        Move-Item -LiteralPath $ci -Destination $dst -Force
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $ci) | Out-Null
    Move-Item -LiteralPath $newCi -Destination $ci -Force
    Write-Host "  * обновлён .github\workflows\ci.yml"
}

# Кэш Python (.pyc) пересоздаётся автоматически
Get-ChildItem -Path $root -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $root ".pytest_cache") -Recurse -Force -ErrorAction SilentlyContinue

if ($Purge) {
    Write-Host "`nУдалено объектов: $moved"
} else {
    Write-Host "`nПеренесено в _to_delete: $moved"
    Write-Host "Проверьте проект и удалите папку _to_delete вручную."
}
